/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observable } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionLoader } from "../extension-loader/extension-loader";

import type { Logger } from "@freelensapp/logger";

import type { ExtensionLoading } from "../extension-loader/extension-loader";
import type {
  InstalledExtension,
  LensExtensionConstructor,
  LensExtensionId,
  LensExtensionInstance,
} from "../installed-extension";

/**
 * The steps of a load are protected: what decides whether a load happens is the
 * loader's reactions, which these tests leave out to drive one load at a time.
 */
interface LoaderInternals {
  requireExtension(extension: InstalledExtension): Promise<LensExtensionConstructor | null>;
  loadUserExtensions(extensions: Map<LensExtensionId, InstalledExtension>): Promise<unknown[]>;
  loadExtensions(extensions: unknown[]): Promise<ExtensionLoading[]>;
}

const developmentExtension = (entryPointName: "main" | "renderer"): InstalledExtension => ({
  id: "my-extension",
  // Nothing is at this path, so a real import of the entry point fails.
  absolutePath: "/nonexistent/my-extension",
  manifestPath: "/nonexistent/my-extension/package.json",
  manifest: {
    name: "my-extension",
    version: "0.1.0",
    engines: { freelens: "^2.0.0" },
    type: "module",
    [entryPointName]: "dist/index.js",
  },
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled: true,
});

interface FakeExtensionBehaviour {
  construct?: () => void;
  activate?: () => Promise<void>;
  enable?: () => Promise<void>;
}

const fakeExtensionClass = (extension: InstalledExtension, behaviour: FakeExtensionBehaviour = {}) =>
  class FakeExtension {
    readonly id = extension.id;
    readonly name = extension.manifest.name;
    readonly sanitizedExtensionId = extension.id;

    constructor() {
      behaviour.construct?.();
    }

    activate = behaviour.activate ?? (async () => {});
    enable = behaviour.enable ?? (async () => {});
    disable = async () => {};
  } as unknown as LensExtensionConstructor;

describe.each(["main", "renderer"] as const)("recording why an extension failed to load in %s", (entryPointName) => {
  let extensionLoader: ExtensionLoader;
  let internals: LoaderInternals;
  let extension: InstalledExtension;

  const load = async () => {
    const loading = await internals.loadExtensions(await internals.loadUserExtensions(extensionLoader.toJSON()));

    await Promise.all(loading.map(({ loaded }) => loaded));
  };

  const loadWith = (behaviour: FakeExtensionBehaviour) => {
    vi.spyOn(internals, "requireExtension").mockResolvedValue(fakeExtensionClass(extension, behaviour));

    return load();
  };

  const stagesOf = () =>
    extensionLoader.getLoadFailures(extension.id).map(({ process, stage }) => ({ process, stage }));

  beforeEach(() => {
    extension = developmentExtension(entryPointName);

    extensionLoader = new ExtensionLoader({
      extensionInstances: observable.map<LensExtensionId, LensExtensionInstance>(),
      logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as unknown as Logger,
      extensionEntryPointName: entryPointName,
      updateExtensionsState: vi.fn(),
      getExtension: () => ({ register: vi.fn(), deregister: vi.fn() }) as never,
      getRandomId: () => "a-token",
      joinPaths: (...paths) => paths.join("/"),
      getBasenameOfPath: (path) => path.split("/").at(-1) ?? "",
      // Only asked for stylesheets, which no failing load gets as far as.
      fetch: vi.fn(async () => ({ status: 404 })) as never,
    });
    internals = extensionLoader as unknown as LoaderInternals;

    extensionLoader.addExtension(extension);
  });

  it("records an entry point which cannot be imported", async () => {
    await load();

    expect(stagesOf()).toEqual([{ process: entryPointName, stage: "import" }]);
    // Which is not the same as having no entry point for this process.
    expect(extensionLoader.getInstanceByName(extension.manifest.name)).toBeUndefined();
  });

  it("records the message of the error the import threw", async () => {
    vi.spyOn(internals, "requireExtension").mockRejectedValue(new ReferenceError("LensExtensions is not defined"));

    await load();

    expect(extensionLoader.getLoadFailures(extension.id)).toEqual([
      { process: entryPointName, stage: "import", message: "LensExtensions is not defined" },
    ]);
  });

  it("records nothing for an extension without an entry point for this process", async () => {
    extensionLoader.addExtension({ ...extension, manifest: { ...extension.manifest, [entryPointName]: undefined } });

    await load();

    expect(stagesOf()).toEqual([]);
    expect(extensionLoader.getInstanceByName(extension.manifest.name)).toBeNull();
  });

  it("records a constructor which throws", async () => {
    await loadWith({
      construct: () => {
        throw new Error("no constructing today");
      },
    });

    expect(extensionLoader.getLoadFailures(extension.id)).toEqual([
      { process: entryPointName, stage: "instantiate", message: "no constructing today" },
    ]);
  });

  it("records an onActivate which rejects", async () => {
    await loadWith({ activate: async () => Promise.reject(new Error("no activating today")) });

    expect(extensionLoader.getLoadFailures(extension.id)).toEqual([
      { process: entryPointName, stage: "activate", message: "no activating today" },
    ]);
  });

  it("records an enable which rejects", async () => {
    await loadWith({ enable: async () => Promise.reject(new Error("no enabling today")) });

    expect(stagesOf()).toEqual([{ process: entryPointName, stage: "enable" }]);
  });

  it("keeps the first failure of a load, which is its cause", async () => {
    await loadWith({
      activate: async () => Promise.reject(new Error("no activating today")),
      enable: async () => Promise.reject(new Error("a consequence")),
    });

    expect(stagesOf()).toEqual([{ process: entryPointName, stage: "activate" }]);
  });

  it("records nothing for an extension which loads", async () => {
    await loadWith({});

    expect(stagesOf()).toEqual([]);
  });

  it("does not import an extension which failed again until something clears the failure", async () => {
    const requireExtension = vi.spyOn(internals, "requireExtension").mockRejectedValue(new Error("missing"));

    await load();
    await load();

    expect(requireExtension).toHaveBeenCalledTimes(1);
  });

  it("clears the failure when the extension is disabled, so enabling it loads it again", async () => {
    const requireExtension = vi.spyOn(internals, "requireExtension").mockRejectedValue(new Error("missing"));

    await load();

    extensionLoader.removeInstance(extension.id);

    expect(stagesOf()).toEqual([]);

    requireExtension.mockResolvedValue(fakeExtensionClass(extension));

    await load();

    expect(requireExtension).toHaveBeenCalledTimes(2);
    expect(stagesOf()).toEqual([]);
  });

  it("clears the failure when the extension is uninstalled", async () => {
    await load();

    extensionLoader.removeExtension(extension.id);

    expect(stagesOf()).toEqual([]);
  });

  it("clears the failure when a development extension is reloaded after a fixed rebuild", async () => {
    const requireExtension = vi.spyOn(internals, "requireExtension").mockRejectedValue(new Error("mid-build"));

    await load();

    expect(stagesOf()).toEqual([{ process: entryPointName, stage: "import" }]);

    requireExtension.mockResolvedValue(fakeExtensionClass(extension));

    await extensionLoader.reloadDevelopmentExtension(extension.id, "token-after");

    expect(stagesOf()).toEqual([]);
    expect(extensionLoader.getInstanceById(extension.id)).toBeDefined();
  });

  it("records the failure of the rebuild when a reload fails again", async () => {
    vi.spyOn(internals, "requireExtension").mockRejectedValueOnce(new Error("first"));

    await load();

    vi.spyOn(internals, "requireExtension").mockRejectedValueOnce(new Error("second"));

    await extensionLoader.reloadDevelopmentExtension(extension.id, "token-after");

    expect(extensionLoader.getLoadFailures(extension.id)).toEqual([
      { process: entryPointName, stage: "import", message: "second" },
    ]);
  });

  it("records nothing for an extension which was disabled while it was being imported", async () => {
    vi.spyOn(internals, "requireExtension").mockImplementation(async () => {
      extensionLoader.addExtension({ ...extension, isEnabled: false });

      throw new Error("missing");
    });

    await load();

    expect(stagesOf()).toEqual([]);
  });
});
