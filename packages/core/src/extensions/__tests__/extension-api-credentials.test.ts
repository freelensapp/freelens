/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fs, { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { observable } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSafeStorage } from "../../features/extension-credentials/main/__tests__/fake-safe-storage";
import { ExtensionCredentialsStore } from "../../features/extension-credentials/main/extension-credentials-store";
import extensionCredentialsStoreInjectable from "../../features/extension-credentials/main/extension-credentials-store.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { Common } from "../extension-api";
import { ExtensionLoader } from "../extension-loader/extension-loader";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";

import type { Logger } from "@freelensapp/logger";

import type { CredentialsFileSystem } from "../../features/extension-credentials/main/extension-credentials-store";
import type {
  InstalledExtension,
  LensExtensionConstructor,
  LensExtensionId,
  LensExtensionInstance,
} from "../installed-extension";
import type { LensExtension } from "../lens-extension";

interface LoaderInternals {
  requireExtension(extension: InstalledExtension): Promise<LensExtensionConstructor | null>;
  loadUserExtensions(extensions: Map<LensExtensionId, InstalledExtension>): Promise<unknown[]>;
  loadExtensions(extensions: unknown[]): Promise<Array<{ loaded: Promise<void> }>>;
}

const installedExtension: InstalledExtension = {
  id: "@my-scope/my-extension",
  absolutePath: "/nonexistent/my-extension",
  manifestPath: "/nonexistent/my-extension/package.json",
  manifest: {
    name: "@my-scope/my-extension",
    version: "0.1.0",
    engines: { freelens: "^2.0.0" },
    main: "dist/index.js",
  },
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled: true,
};

// An extension as an author writes it: the credentials in a field, initialized
// while the loader is still constructing the instance.
class MyExtension {
  readonly id = installedExtension.id;
  readonly name = installedExtension.manifest.name;
  readonly sanitizedExtensionId = "my-scope--my-extension";
  readonly credentials = Common.Credentials.forExtension(this as unknown as LensExtension);

  activate = async () => {};
  enable = async () => {};
  disable = async () => {};
}

describe("Common.Credentials", () => {
  let root: string;
  let extensionLoader: ExtensionLoader;

  const loadedInstance = () => extensionLoader.getInstanceById(installedExtension.id) as unknown as MyExtension;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "freelens-extension-credentials-"));

    const di = getDiForUnitTesting();

    di.override(
      extensionCredentialsStoreInjectable,
      () =>
        new ExtensionCredentialsStore({
          directory: root,
          safeStorage: createFakeSafeStorage(),
          fs: fs as CredentialsFileSystem,
          isLinux: true,
          logger: { warn: vi.fn() } as unknown as Logger,
          whenReady: async () => {},
          getRandomId: () => globalThis.crypto.randomUUID(),
        }),
    );

    extensionLoader = new ExtensionLoader({
      extensionInstances: observable.map<LensExtensionId, LensExtensionInstance>(),
      logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as unknown as Logger,
      extensionEntryPointName: "main",
      updateExtensionsState: vi.fn(),
      getExtension: () => ({ register: vi.fn(), deregister: vi.fn() }) as never,
      getRandomId: () => "a-token",
      joinPaths: (...paths) => paths.join("/"),
      getBasenameOfPath: (path) => path.split("/").at(-1) ?? "",
      fetch: vi.fn() as never,
    });
    di.override(extensionLoaderInjectable, () => extensionLoader);

    const internals = extensionLoader as unknown as LoaderInternals;

    extensionLoader.addExtension(installedExtension);
    vi.spyOn(internals, "requireExtension").mockResolvedValue(MyExtension as unknown as LensExtensionConstructor);

    const loading = await internals.loadExtensions(await internals.loadUserExtensions(extensionLoader.toJSON()));

    await Promise.all(loading.map(({ loaded }) => loaded));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("keeps the values of an extension the host loaded, in a file named after its sanitized ID", async () => {
    const { credentials } = loadedInstance();

    expect(await credentials.isAvailable()).toBe(true);
    await credentials.set("token", "value");

    expect(await credentials.get("token")).toBe("value");
    expect(await credentials.keys()).toEqual(["token"]);
    expect(await readdir(root)).toEqual(["my-scope--my-extension.json"]);
  });

  it("derives the scope from the instance the host loaded, not from its properties", async () => {
    const instance = loadedInstance();

    await instance.credentials.set("token", "value");
    (instance as { id: string }).id = "someone-else";

    expect(await Common.Credentials.forExtension(instance as unknown as LensExtension).get("token")).toBe("value");
    expect(await readdir(root)).toEqual(["my-scope--my-extension.json"]);
  });

  it.each([
    ["an instance the host did not construct", () => new MyExtension()],
    ["a lookalike object", () => ({ id: installedExtension.id, name: installedExtension.manifest.name })],
    ["a string", () => installedExtension.id],
    ["undefined", () => undefined],
  ])("rejects every operation for %s", async (_, value) => {
    const credentials = Common.Credentials.forExtension(value() as unknown as LensExtension);

    await expect(credentials.isAvailable()).rejects.toThrow(TypeError);
    await expect(credentials.get("token")).rejects.toThrow(
      "Credentials are only available to an extension instance that Freelens loaded",
    );
    await expect(credentials.set("token", "value")).rejects.toThrow(TypeError);
    await expect(credentials.delete("token")).rejects.toThrow(TypeError);
    await expect(credentials.keys()).rejects.toThrow(TypeError);
    expect(await readdir(root)).toEqual([]);
  });

  it("validates the key and the value in the process that calls", async () => {
    const { credentials } = loadedInstance();

    await expect(credentials.set("not a key", "value")).rejects.toThrow(TypeError);
    await expect(credentials.set("token", { value: "value" } as unknown as string)).rejects.toThrow(TypeError);
  });

  it("keeps the values when the extension is disabled, and lets onDeactivate reach them", async () => {
    const instance = loadedInstance();

    await instance.credentials.set("token", "value");
    extensionLoader.removeInstance(installedExtension.id);

    expect(extensionLoader.getInstanceById(installedExtension.id)).toBeUndefined();
    expect(await instance.credentials.get("token")).toBe("value");
    expect(await readdir(root)).toEqual(["my-scope--my-extension.json"]);
  });
});
