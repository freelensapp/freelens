/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import { TerminalChannels } from "../../../common/terminal/channels";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionStateInjectable } from "../../../features/vars/build-version/main/init.injectable";
import freelensProxyPortInjectable from "../../freelens-proxy/freelens-proxy-port.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import openStandaloneShellSessionInjectable from "./open.injectable";

import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { Mock, MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { TerminalMessage } from "../../../common/terminal/channels";
import type { KubeconfigManager, ProxyKubeconfigPaths } from "../../kubeconfig-manager/kubeconfig-manager";
import type { CreateKubectl } from "../../kubectl/create-kubectl.injectable";
import type { SpawnPty } from "../spawn-pty.injectable";
import type { OpenStandaloneShellSession } from "./open.injectable";

describe("technical unit tests for standalone shell sessions", () => {
  let di: DiContainer;
  let openStandaloneShellSession: OpenStandaloneShellSession;
  let spawnPtyMock: MockedFunction<SpawnPty>;
  let sent: TerminalMessage[];
  let createKubectl: MockedFunction<() => unknown>;
  let ensurePath: MockedFunction<() => Promise<string>>;
  let ensurePaths: MockedFunction<() => Promise<ProxyKubeconfigPaths>>;
  let logger: Record<"debug" | "info" | "warn" | "error" | "silly", Mock>;
  let shellPid: number;
  let emitShellData: (data: string) => void;

  const websocket = () => {
    const socket = {
      on: vi.fn(() => socket),
      once: vi.fn(() => socket),
      send: vi.fn((raw: string) => void sent.push(JSON.parse(raw))),
      readyState: 1,
      OPEN: 1,
    } as Partial<WebSocket> as WebSocket;

    return socket;
  };

  const spawnedWith = () => {
    const call = spawnPtyMock.mock.calls[0];

    expect(call).toBeDefined();

    const [file, args, options] = call;

    return { file, args, options, env: options.env ?? {} };
  };

  beforeEach(() => {
    di = getDiForUnitTesting();
    sent = [];

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
    di.override(buildVersionStateInjectable, () => "1.1.1");
    di.override(pathExistsInjectable, () => () => {
      throw new Error("tried call pathExists without override");
    });
    di.override(pathExistsSyncInjectable, () => () => {
      throw new Error("tried call pathExistsSync without override");
    });
    di.override(readJsonSyncInjectable, () => () => {
      throw new Error("tried call readJsonSync without override");
    });
    di.override(writeJsonSyncInjectable, () => () => {
      throw new Error("tried call writeJsonSync without override");
    });
    di.override(statInjectable, () => () => {
      throw new Error("tried call stat without override");
    });
    di.inject(freelensProxyPortInjectable).set(1111);

    di.override(userShellSettingInjectable, () => computed(() => "/bin/zsh"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: {
        PATH: "/home/some-user/bin:/usr/local/bin:/usr/bin",
        KUBECONFIG: "/home/some-user/.kube/config",
        KUBECACHEDIR: "/home/some-user/.kube/some-cache",
        HTTPS_PROXY: "http://some-user-proxy:3128",
        HOME: "/home/some-user",
      },
    }));

    // A standalone session has no cluster, so neither of these may be reached.
    createKubectl = vi.fn(() => {
      throw new Error("tried to create a kubectl for a session without a cluster");
    });
    ensurePath = vi.fn(async () => {
      throw new Error("tried to start the cluster proxy for a session without a cluster");
    });
    di.override(createKubectlInjectable, () => createKubectl as unknown as CreateKubectl);
    ensurePaths = vi.fn(async () => {
      throw new Error("tried to start the cluster proxy for a session without a cluster");
    });
    di.override(
      kubeconfigManagerInjectable,
      () => ({ ensurePath, ensurePaths }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), silly: vi.fn() };
    di.override(loggerInjectionToken, () => logger as unknown as Logger);

    shellPid = 12343;

    const dataListeners = new Set<(data: string) => void>();

    emitShellData = (data) => [...dataListeners].forEach((listener) => listener(data));
    spawnPtyMock = vi.fn(
      () =>
        ({
          cols: 80,
          rows: 40,
          get pid() {
            return shellPid;
          },
          handleFlowControl: false,
          kill: vi.fn(),
          onData: vi.fn((listener: (data: string) => void) => {
            dataListeners.add(listener);

            return { dispose: () => void dataListeners.delete(listener) };
          }),
          onExit: vi.fn(),
          pause: vi.fn(),
          process: "my-pty",
          resize: vi.fn(),
          resume: vi.fn(),
          write: vi.fn(),
          on: vi.fn(),
          clear: vi.fn(),
        }) as Partial<IPty> as IPty,
    );
    di.override(spawnPtyInjectable, () => spawnPtyMock);

    openStandaloneShellSession = di.inject(openStandaloneShellSessionInjectable);
  });

  it("never constructs a kubectl nor starts the cluster proxy", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(createKubectl).not.toHaveBeenCalled();
    expect(ensurePath).not.toHaveBeenCalled();
    expect(ensurePaths).not.toHaveBeenCalled();
  });

  it("reports only the phases that a session without a cluster actually has", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(
      sent
        .filter((message) => message.type === TerminalChannels.STATUS)
        .map((message) => (message as { data: { message: string } }).data.message),
    ).toEqual(["Resolving shell environment ...", "Starting shell ..."]);
  });

  it("leaves the user's own KUBECONFIG alone", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.KUBECONFIG).toBe("/home/some-user/.kube/config");
  });

  it("exports the application's proxy preference as HTTPS_PROXY in place of the user's own", async () => {
    di.inject(userPreferencesStateInjectable).httpsProxy = "socks5://some-proxy:1080";

    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.HTTPS_PROXY).toBe("socks5://some-proxy:1080");
  });

  it("leaves the user's own HTTPS_PROXY alone when the application has no proxy preference", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.HTTPS_PROXY).toBe("http://some-user-proxy:3128");
  });

  it("leaves the user's own KUBECACHEDIR alone", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.KUBECACHEDIR).toBe("/home/some-user/.kube/some-cache");
  });

  it("appends the bundled binaries after the user's own PATH, so a host kubectl still wins", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.PATH).toBe(
      ["/home/some-user/bin", "/usr/local/bin", "/usr/bin", "/some-bundled-binaries-directory"].join(":"),
    );
  });

  it("puts no directory derived from the kubectl or helm preference on PATH", async () => {
    const state = di.inject(userPreferencesStateInjectable);

    state.helmBinariesPath = "/opt/homebrew/bin/helm";
    state.kubectlBinariesPath = "/opt/kubectl/bin/kubectl";
    state.downloadKubectlBinaries = false;

    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    const path = (spawnedWith().env.PATH ?? "").split(":");

    expect(path).toEqual(["/home/some-user/bin", "/usr/local/bin", "/usr/bin", "/some-bundled-binaries-directory"]);
  });

  it("passes no init file, no ZDOTDIR and no PATH-forcing argument to the shell", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    const { args, env } = spawnedWith();

    expect(args).toEqual(["--login"]);
    expect(env.ZDOTDIR).toBeUndefined();
    expect(env.OLD_ZDOTDIR).toBeUndefined();
  });

  it("spawns the shell on node-pty's bundled ConPTY DLL, without the stale winpty switch", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    const { options } = spawnedWith();

    expect(options).toHaveProperty("useConptyDll", true);
    expect(options).not.toHaveProperty("useConpty");
  });

  describe("logging the PID of the shell", () => {
    const pidLogLines = () =>
      logger.info.mock.calls.map(([message]) => String(message)).filter((message) => message.includes("PID="));

    it("logs it at once when node-pty knows it at spawn", async () => {
      await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

      expect(pidLogLines()).toEqual(["[SHELL-SESSION]: PTY for standalone:my-tab-id is started with PID=12343"]);
    });

    /**
     * On Windows node-pty reports 0 until ConPTY has connected, which happens
     * before the shell's first output.
     */
    it("waits for the first output when node-pty reports 0 at spawn, and then logs it once", async () => {
      shellPid = 0;

      await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

      expect(pidLogLines()).toEqual([]);

      shellPid = 4321;
      emitShellData("PS C:\\> ");
      emitShellData("more output");

      expect(pidLogLines()).toEqual(["[SHELL-SESSION]: PTY for standalone:my-tab-id is started with PID=4321"]);
    });
  });
});
