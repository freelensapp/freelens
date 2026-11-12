/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extensionLoaderFromMainChannel,
  extensionLoaderLoadFailuresFromMainChannel,
  extensionLoaderSetIsEnabledChannel,
  extensionLoaderTornDownChannel,
} from "../../common/ipc/extension-handling";
import { ExtensionLoader } from "../extension-loader/extension-loader";

import type { Logger } from "@freelensapp/logger";

import type {
  InstalledExtension,
  LensExtensionConstructor,
  LensExtensionId,
  LensExtensionInstance,
} from "../installed-extension";

type Process = "main" | "root-frame" | "cluster-frame";

/**
 * Three processes sharing one realm, connected by a fake IPC whose deliveries
 * the test makes one at a time.
 *
 * The loader tells main from a renderer by the `ipcMain` and `ipcRenderer` it
 * imports from electron, so those answer for whichever process is running at
 * the moment: `runAs` sets it for the duration of a call, and a delivery runs
 * its listeners as the process it is addressed to. Every message is serialised
 * on the way, as real IPC does, so no two loaders ever share an object.
 */
const ipc = vi.hoisted(() => {
  type Listener = (event: unknown, ...args: any[]) => unknown;

  interface Message {
    from: string;
    to: string;
    channel: string;
    deliver: () => void;
  }

  const serialise = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

  const state = {
    current: "main",
    mainHandlers: new Map<string, Listener>(),
    mainListeners: new Map<string, Listener[]>(),
    rendererListeners: new Map<string, Map<string, Listener[]>>(),
    queue: [] as Message[],
    // Every message ever sent, delivered or not.
    sent: [] as Omit<Message, "deliver">[],
  };

  const send = (message: Message) => {
    state.queue.push(message);
    state.sent.push({ from: message.from, to: message.to, channel: message.channel });
  };

  const runAs = <T>(process: string, fn: () => T): T => {
    const previous = state.current;

    state.current = process;

    try {
      return fn();
    } finally {
      state.current = previous;
    }
  };

  const listenersOf = (map: Map<string, Listener[]>, channel: string) => {
    let listeners = map.get(channel);

    if (!listeners) {
      listeners = [];
      map.set(channel, listeners);
    }

    return listeners;
  };

  // What `broadcastMessage` does in each process: main calls its own
  // listeners and sends to every frame listening, and a renderer hands the
  // message to main, which broadcasts it from there.
  const broadcastMessage = (channel: string, ...rawArgs: unknown[]): Promise<void> => {
    const args = serialise(rawArgs);
    const from = state.current;

    if (from === "main") {
      for (const listener of [...listenersOf(state.mainListeners, channel)]) {
        listener({}, ...serialise(args));
      }

      for (const [to, channels] of state.rendererListeners) {
        if (!channels.get(channel)?.length) {
          continue;
        }

        send({
          from,
          to,
          channel,
          deliver: () =>
            runAs(to, () => {
              for (const listener of [...listenersOf(channels, channel)]) {
                listener({}, ...serialise(args));
              }
            }),
        });
      }
    } else {
      send({
        from,
        to: "main",
        channel,
        deliver: () => runAs("main", () => void broadcastMessage(channel, ...args)),
      });
    }

    return Promise.resolve();
  };

  // A renderer's `ipcRenderer.invoke` of a handler in main.
  const requestMain = (channel: string, ...rawArgs: unknown[]): Promise<any> => {
    const args = serialise(rawArgs);

    return new Promise((resolve, reject) => {
      send({
        from: state.current,
        to: "main",
        channel,
        deliver: () =>
          runAs("main", () => {
            const handler = state.mainHandlers.get(channel);

            if (!handler) {
              return reject(new Error(`No handler in main for "${channel}"`));
            }

            Promise.resolve(handler({}, ...args)).then((result) => resolve(serialise(result)), reject);
          }),
      });
    });
  };

  return {
    state,
    runAs,
    broadcastMessage,
    requestMain,
    ipcMainHandle: (channel: string, handler: Listener) => {
      state.mainHandlers.set(channel, handler);
    },
    ipcMainOn: (channel: string, listener: Listener) => {
      listenersOf(state.mainListeners, channel).push(listener);

      return () => undefined;
    },
    ipcRendererOn: (channel: string, listener: Listener) => {
      let channels = state.rendererListeners.get(state.current);

      if (!channels) {
        channels = new Map();
        state.rendererListeners.set(state.current, channels);
      }

      listenersOf(channels, channel).push(listener);

      return () => undefined;
    },
    reset: () => {
      state.current = "main";
      state.mainHandlers.clear();
      state.mainListeners.clear();
      state.rendererListeners.clear();
      state.queue.length = 0;
      state.sent.length = 0;
    },
  };
});

vi.mock("electron", () => ({
  get ipcMain() {
    return ipc.state.current === "main" ? {} : undefined;
  },
  get ipcRenderer() {
    return ipc.state.current === "main" ? undefined : {};
  },
}));

vi.mock("../../common/ipc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  broadcastMessage: ipc.broadcastMessage,
  ipcMainHandle: ipc.ipcMainHandle,
  ipcMainOn: ipc.ipcMainOn,
  ipcRendererOn: ipc.ipcRendererOn,
}));

vi.mock("../../renderer/ipc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  // The initial state is answered at once: what is under test is what happens
  // after every process is up.
  requestExtensionLoaderInitialState: () =>
    ipc.runAs("main", () => {
      const handler = ipc.state.mainHandlers.get(extensionLoaderFromMainChannel);

      return Promise.resolve(JSON.parse(JSON.stringify(handler?.({}) ?? [])));
    }),
  requestExtensionLoaderMainLoadFailures: () =>
    ipc.runAs("main", () => {
      const handler = ipc.state.mainHandlers.get(extensionLoaderLoadFailuresFromMainChannel);

      return Promise.resolve(JSON.parse(JSON.stringify(handler?.({}) ?? [])));
    }),
  requestExtensionLoaderSetIsEnabled: (extensionId: string, isEnabled: boolean) =>
    ipc.requestMain(extensionLoaderSetIsEnabledChannel, extensionId, isEnabled),
  requestExtensionLoaderTornDown: (extensionId: string) => ipc.requestMain(extensionLoaderTornDownChannel, extensionId),
}));

const extensionId: LensExtensionId = "@freelensapp/example-extension";

const discoveredExtension = (isEnabled: boolean): InstalledExtension => ({
  id: extensionId,
  absolutePath: "/extensions/freelensapp--example-extension/2.0.0-1-0f1e2d3c",
  manifestPath: "/extensions/freelensapp--example-extension/2.0.0-1-0f1e2d3c/package.json",
  manifest: {
    name: extensionId,
    version: "2.0.0-1",
    engines: { freelens: "^2.0.0" },
  },
  isCompatible: true,
  isManaged: true,
  isVerified: true,
  isEnabled,
});

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  silly: vi.fn(),
  warn: vi.fn(),
} as unknown as Logger;

const createLoader = (process: Process, enabledStates: boolean[]) =>
  new ExtensionLoader({
    extensionInstances: observable.map<LensExtensionId, LensExtensionInstance>(),
    logger,
    extensionEntryPointName: process === "main" ? "main" : "renderer",
    updateExtensionsState: (state) => {
      for (const [id, { enabled }] of state as [LensExtensionId, { enabled: boolean }][]) {
        if (id === extensionId) {
          enabledStates.push(enabled);
        }
      }
    },
    getExtension: () => ({ register: vi.fn(), deregister: vi.fn() }) as never,
    getRandomId: () => "some-random-id",
    joinPaths: (...paths) => paths.join("/"),
    getBasenameOfPath: (path) => path.split("/").at(-1) ?? "",
    fetch: vi.fn() as never,
  });

describe("ExtensionLoader keeps isEnabled consistent between main and the renderer frames", () => {
  let loaders: Record<Process, ExtensionLoader>;
  // What main wrote to the enabled-extensions state, in order: one entry per
  // write of `lens-extensions.json`.
  let persistedByMain: boolean[];

  const isEnabledIn = (process: Process) => loaders[process].getExtensionById(extensionId)?.isEnabled;

  const isEnabledEverywhere = () => ({
    main: isEnabledIn("main"),
    "root-frame": isEnabledIn("root-frame"),
    "cluster-frame": isEnabledIn("cluster-frame"),
  });

  /**
   * Deliver the first message still in flight from one process to another.
   */
  const deliver = (from: Process, to: Process) => {
    const index = ipc.state.queue.findIndex((message) => message.from === from && message.to === to);

    if (index < 0) {
      throw new Error(`No message in flight from ${from} to ${to}`);
    }

    const [message] = ipc.state.queue.splice(index, 1);

    message.deliver();
  };

  /**
   * Deliver everything in flight, in the order it was sent, including what
   * the deliveries send in turn, until nothing is left. Two hundred
   * deliveries is far more than any settling exchange between three
   * processes needs, so a run that gets there is an exchange that does not
   * end.
   */
  const settle = () => {
    for (let delivered = 0; ipc.state.queue.length > 0; delivered++) {
      if (delivered === 200) {
        throw new Error(
          `Still exchanging after ${delivered} deliveries; the last states main wrote were ` +
            `${JSON.stringify(persistedByMain.slice(-12))}`,
        );
      }

      ipc.state.queue.shift()?.deliver();
    }
  };

  beforeEach(async () => {
    ipc.reset();
    persistedByMain = [];

    loaders = {
      main: createLoader("main", persistedByMain),
      "root-frame": createLoader("root-frame", []),
      "cluster-frame": createLoader("cluster-frame", []),
    };

    // Main starts first, then the root frame, then the frame of an opened
    // cluster, each one in its own process.
    for (const process of ["main", "root-frame", "cluster-frame"] as const) {
      await ipc.runAs(process, () => loaders[process].init());
    }

    settle();
  });

  it("keeps an enable from the root frame when the cluster frame learns of the extension after it", async () => {
    // Main discovers the newly installed build. Nothing in the enabled state
    // knows it yet, so it is disabled.
    ipc.runAs("main", () => {
      runInAction(() => loaders.main.addExtension(discoveredExtension(false)));
    });

    // The root frame, which ran the installation, sees it arrive and enables
    // it, as unpack-extension does once the loader has the extension.
    deliver("main", "root-frame");

    const enabling = ipc.runAs("root-frame", () =>
      runInAction(() => loaders["root-frame"].setIsEnabled(extensionId, true)),
    );

    // Only then does the cluster frame hear of the discovery.
    deliver("main", "cluster-frame");

    settle();
    await enabling;

    expect(isEnabledEverywhere()).toEqual({
      main: true,
      "root-frame": true,
      "cluster-frame": true,
    });
    expect(persistedByMain.at(-1)).toBe(true);
  });

  it("has the renderer frames send main their requests and never its own state", async () => {
    ipc.runAs("main", () => {
      runInAction(() => loaders.main.addExtension(discoveredExtension(false)));
    });
    settle();

    const enabling = ipc.runAs("root-frame", () => loaders["root-frame"].setIsEnabled(extensionId, true));

    settle();
    await enabling;

    expect(ipc.state.sent.filter(({ from }) => from !== "main")).toEqual([
      { from: "root-frame", to: "main", channel: extensionLoaderSetIsEnabledChannel },
    ]);
    expect(isEnabledEverywhere()).toEqual({
      main: true,
      "root-frame": true,
      "cluster-frame": true,
    });
  });

  it("ends on the last choice when the root frame toggles an extension twice in a row", async () => {
    ipc.runAs("main", () => {
      runInAction(() => loaders.main.addExtension(discoveredExtension(true)));
    });
    settle();

    // Disable and enable again before either change has reached main.
    const disabling = ipc.runAs("root-frame", () =>
      runInAction(() => loaders["root-frame"].setIsEnabled(extensionId, false)),
    );
    const enabling = ipc.runAs("root-frame", () =>
      runInAction(() => loaders["root-frame"].setIsEnabled(extensionId, true)),
    );

    settle();
    await Promise.all([disabling, enabling]);

    expect(isEnabledEverywhere()).toEqual({
      main: true,
      "root-frame": true,
      "cluster-frame": true,
    });
    expect(persistedByMain.at(-1)).toBe(true);
  });
});

describe("ExtensionLoader brings main's load failures to the renderer frames", () => {
  let main: ExtensionLoader;

  const settle = () => {
    while (ipc.state.queue.length > 0) {
      ipc.state.queue.shift()?.deliver();
    }
  };

  const startFrame = async (process: Exclude<Process, "main">) => {
    const loader = createLoader(process, []);

    await ipc.runAs(process, () => loader.init());
    settle();

    return loader;
  };

  const installInMain = () =>
    ipc.runAs("main", () => {
      runInAction(() => main.addExtension(discoveredExtension(true)));
    });

  const mainFailure = {
    process: "main",
    stage: "import",
    message: "Cannot find module 'dist/main.js'",
  };

  beforeEach(async () => {
    ipc.reset();

    main = createLoader("main", []);

    // Main's entry point fails to import. The frames have no renderer entry
    // point, so nothing fails in them.
    vi.spyOn(
      main as unknown as { requireExtension: () => Promise<LensExtensionConstructor | null> },
      "requireExtension",
    ).mockRejectedValue(new Error(mainFailure.message));

    await ipc.runAs("main", () => main.init());
  });

  it("gives a frame which starts after the failure main's failure with the initial state", async () => {
    installInMain();
    await vi.waitFor(() => expect(main.getLoadFailures(extensionId)).toEqual([mainFailure]));

    const rootFrame = await startFrame("root-frame");

    await vi.waitFor(() => expect(rootFrame.getLoadFailures(extensionId)).toEqual([mainFailure]));
  });

  it("broadcasts main's failure to a frame which is already up, and its clearing when it is disabled", async () => {
    const rootFrame = await startFrame("root-frame");

    installInMain();
    await vi.waitFor(() => expect(main.getLoadFailures(extensionId)).toEqual([mainFailure]));
    settle();

    expect(rootFrame.getLoadFailures(extensionId)).toEqual([mainFailure]);

    const disabling = ipc.runAs("root-frame", () => rootFrame.setIsEnabled(extensionId, false));

    settle();
    await disabling;
    settle();

    expect(main.getLoadFailures(extensionId)).toEqual([]);
    expect(rootFrame.getLoadFailures(extensionId)).toEqual([]);
  });
});

describe("ExtensionLoader tells when an extension is torn down in main and in the renderer", () => {
  let main: ExtensionLoader;
  let rootFrame: ExtensionLoader;
  // What lets the `onDeactivate` of the instance in each process return, when
  // the test chooses.
  let finishDeactivating: Record<"main" | "root-frame", () => void>;

  const settle = () => {
    while (ipc.state.queue.length > 0) {
      ipc.state.queue.shift()?.deliver();
    }
  };

  const loadsAnInstance = (loader: ExtensionLoader, process: "main" | "root-frame") => {
    const deactivated = new Promise<void>((resolve) => {
      finishDeactivating[process] = resolve;
    });

    class SomeExtension {
      readonly id: LensExtensionId;
      readonly name: string;

      constructor(extension: InstalledExtension) {
        this.id = extension.id;
        this.name = extension.manifest.name;
      }

      activate = async () => {};
      enable = async () => {};
      disable = () => deactivated;
    }

    vi.spyOn(
      loader as unknown as { requireExtension: () => Promise<LensExtensionConstructor | null> },
      "requireExtension",
    ).mockResolvedValue(SomeExtension as unknown as LensExtensionConstructor);
  };

  const hasSettled = async (promise: Promise<unknown>) => {
    let settled = false;

    void promise.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    // Long enough for every answer already on its way to arrive.
    await new Promise((resolve) => setTimeout(resolve, 0));

    return settled;
  };

  const disableFromTheRootFrame = async () => {
    const disabling = ipc.runAs("root-frame", () => rootFrame.setIsEnabled(extensionId, false));

    settle();
    await disabling;
  };

  beforeEach(async () => {
    ipc.reset();
    finishDeactivating = { main: () => {}, "root-frame": () => {} };

    main = createLoader("main", []);
    rootFrame = createLoader("root-frame", []);
    loadsAnInstance(main, "main");
    loadsAnInstance(rootFrame, "root-frame");

    await ipc.runAs("main", () => main.init());
    await ipc.runAs("root-frame", async () => {
      await rootFrame.init();
      await rootFrame.autoInitExtensions();
    });
    settle();

    ipc.runAs("main", () => {
      runInAction(() => main.addExtension(discoveredExtension(true)));
    });
    settle();

    await vi.waitFor(() => {
      expect(main.getInstanceById(extensionId)).toBeDefined();
      expect(rootFrame.getInstanceById(extensionId)).toBeDefined();
    });
  });

  it("does not resolve while the extension is enabled", async () => {
    const tornDown = ipc.runAs("root-frame", () => rootFrame.whenTornDown(extensionId));

    settle();

    expect(await hasSettled(tornDown)).toBe(false);
  });

  it("resolves once the onDeactivate of both processes has returned, not when the disable has", async () => {
    await disableFromTheRootFrame();

    // Both processes have taken the instance out already, and the teardown is
    // still running in both.
    expect(main.getInstanceById(extensionId)).toBeUndefined();
    expect(rootFrame.getInstanceById(extensionId)).toBeUndefined();

    const tornDown = ipc.runAs("root-frame", () => rootFrame.whenTornDown(extensionId));

    settle();

    expect(await hasSettled(tornDown)).toBe(false);

    finishDeactivating.main();

    expect(await hasSettled(tornDown)).toBe(false);

    finishDeactivating["root-frame"]();

    await expect(tornDown).resolves.toBeUndefined();
  });

  it("waits for main when the renderer has finished first", async () => {
    await disableFromTheRootFrame();

    const tornDown = ipc.runAs("root-frame", () => rootFrame.whenTornDown(extensionId));

    settle();
    finishDeactivating["root-frame"]();

    expect(await hasSettled(tornDown)).toBe(false);

    finishDeactivating.main();

    await expect(tornDown).resolves.toBeUndefined();
  });
});
