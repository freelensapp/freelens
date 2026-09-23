/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import ensureDirInjectable from "../../common/fs/ensure-dir.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../common/fs/path-exists-sync.injectable";
import readDirectoryInjectable from "../../common/fs/read-directory.injectable";
import readJsonFileInjectable from "../../common/fs/read-json-file.injectable";
import readJsonSyncInjectable from "../../common/fs/read-json-sync.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import watchInjectable from "../../common/fs/watch/watch.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import extensionApiVersionInjectable from "../../common/vars/extension-api-version.injectable";
import installedExtensionsStateInjectable from "../../features/extensions/installer/common/installed-extensions-state.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import extensionDiscoveryInjectable from "./extension-discovery.injectable";
import type { Dirent } from "node:fs";

import type { Mock } from "vitest";

import type { InstalledExtensionEntry } from "../../features/extensions/installer/common/installed-extensions";
import type { ExtensionDiscovery } from "./extension-discovery";

const extensionsRoot = "/some-directory-for-user-data/extensions";

const directoryEntry = (name: string) =>
  ({
    name,
    isDirectory: () => true,
    isSymbolicLink: () => false,
  }) as Dirent;

const manifestOf = (name: string, version: string) => ({
  name,
  version,
  engines: {
    freelens: "0.1.0",
  },
});

describe("ExtensionDiscovery", () => {
  let extensionDiscovery: ExtensionDiscovery;
  let installedExtensions: Map<string, InstalledExtensionEntry>;
  let readDirectoryMock: Mock;
  let readJsonFileMock: Mock;
  let pathExistsMock: Mock;
  let removePathMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(extensionApiVersionInjectable, () => "0.1.0");
    di.override(pathExistsSyncInjectable, () => () => {
      throw new Error("tried call pathExistsSync without override");
    });
    di.override(readJsonSyncInjectable, () => () => {
      throw new Error("tried call readJsonSync without override");
    });
    di.override(writeJsonSyncInjectable, () => () => {
      throw new Error("tried call writeJsonSync without override");
    });

    readDirectoryMock = vi.fn(() => Promise.resolve([]));
    di.override(readDirectoryInjectable, () => readDirectoryMock);

    readJsonFileMock = vi.fn();
    di.override(readJsonFileInjectable, () => readJsonFileMock);

    // Nothing is a directory-with-a-manifest unless a test says so, so the
    // managed builds below a name are what discovery looks at.
    pathExistsMock = vi.fn(() => Promise.resolve(false));
    di.override(pathExistsInjectable, () => pathExistsMock);

    removePathMock = vi.fn(() => Promise.resolve());
    di.override(removePathInjectable, () => removePathMock);

    di.override(ensureDirInjectable, () => async () => {});
    di.override(watchInjectable, () => () => {
      throw new Error("tried to watch without override");
    });

    installedExtensions = di.inject(installedExtensionsStateInjectable);
    extensionDiscovery = di.inject(extensionDiscoveryInjectable);
  });

  it("discovers a managed build below the extensions root", async () => {
    readDirectoryMock.mockImplementation(async (directory: string) => {
      if (directory === extensionsRoot) {
        return [directoryEntry("my-extension")];
      }

      if (directory === `${extensionsRoot}/my-extension`) {
        return [directoryEntry("1.0.0-0f1e2d3c")];
      }

      return [];
    });
    readJsonFileMock.mockImplementation(async (path: string) => {
      expect(path).toBe(`${extensionsRoot}/my-extension/1.0.0-0f1e2d3c/package.json`);

      return manifestOf("my-extension", "1.0.0");
    });

    const extensions = await extensionDiscovery.load();

    expect([...extensions.values()]).toEqual([
      {
        id: "my-extension",
        absolutePath: `${extensionsRoot}/my-extension/1.0.0-0f1e2d3c`,
        manifestPath: `${extensionsRoot}/my-extension/1.0.0-0f1e2d3c/package.json`,
        manifest: manifestOf("my-extension", "1.0.0"),
        isEnabled: false,
        isCompatible: true,
        isManaged: true,
        // Nothing recorded the install, so nothing claims it was verified.
        isVerified: false,
      },
    ]);
  });

  it("records a build it found on disk without a record, so the sweep does not collect it", async () => {
    readDirectoryMock.mockImplementation(async (directory: string) =>
      directory === extensionsRoot
        ? [directoryEntry("my-extension")]
        : directory === `${extensionsRoot}/my-extension`
          ? [directoryEntry("1.0.0-0f1e2d3c")]
          : [],
    );
    readJsonFileMock.mockImplementation(async () => manifestOf("my-extension", "1.0.0"));

    await extensionDiscovery.load();

    expect(installedExtensions.get("my-extension")).toEqual({
      name: "my-extension",
      path: `${extensionsRoot}/my-extension/1.0.0-0f1e2d3c`,
      version: "1.0.0",
      digest: "0f1e2d3c",
      verified: false,
    });
    expect(removePathMock).not.toHaveBeenCalled();
  });

  it("sweeps a build which is on disk but is not the live one", async () => {
    runInAction(() => {
      installedExtensions.set("my-extension", {
        name: "my-extension",
        path: `${extensionsRoot}/my-extension/2.0.0-abcdef01`,
        version: "2.0.0",
        digest: "abcdef01",
        verified: true,
      });
    });

    readDirectoryMock.mockImplementation(async (directory: string) =>
      directory === extensionsRoot
        ? [directoryEntry("my-extension")]
        : directory === `${extensionsRoot}/my-extension`
          ? [directoryEntry("1.0.0-0f1e2d3c"), directoryEntry("2.0.0-abcdef01")]
          : [],
    );
    readJsonFileMock.mockImplementation(async () => manifestOf("my-extension", "2.0.0"));

    const extensions = await extensionDiscovery.load();

    expect(extensions.get("my-extension")).toMatchObject({
      absolutePath: `${extensionsRoot}/my-extension/2.0.0-abcdef01`,
      isVerified: true,
    });
    expect(removePathMock).toHaveBeenCalledWith(`${extensionsRoot}/my-extension/1.0.0-0f1e2d3c`);
    expect(removePathMock).not.toHaveBeenCalledWith(`${extensionsRoot}/my-extension/2.0.0-abcdef01`);
  });

  it("discovers a development extension from the external path recorded for it", async () => {
    runInAction(() => {
      installedExtensions.set("dev-extension", {
        name: "dev-extension",
        path: "/home/someone/src/dev-extension",
        source: { kind: "directory", path: "/home/someone/src/dev-extension" },
        verified: false,
      });
    });

    readJsonFileMock.mockImplementation(async (path: string) => {
      expect(path).toBe("/home/someone/src/dev-extension/package.json");

      return manifestOf("dev-extension", "0.1.0");
    });

    const extensions = await extensionDiscovery.load();

    expect(extensions.get("dev-extension")).toMatchObject({
      absolutePath: "/home/someone/src/dev-extension",
      // No `<version>-<digest>` segment: unmanaged, and unverified by
      // construction.
      isManaged: false,
      isVerified: false,
    });
  });

  it("deletes the whole managed directory when uninstalling a managed extension", async () => {
    readDirectoryMock.mockImplementation(async (directory: string) =>
      directory === extensionsRoot
        ? [directoryEntry("my-extension")]
        : directory === `${extensionsRoot}/my-extension`
          ? [directoryEntry("1.0.0-0f1e2d3c")]
          : [],
    );
    readJsonFileMock.mockImplementation(async () => manifestOf("my-extension", "1.0.0"));

    await extensionDiscovery.load();
    removePathMock.mockClear();

    await extensionDiscovery.uninstallExtension("my-extension");

    expect(installedExtensions.has("my-extension")).toBe(false);
    expect(removePathMock).toHaveBeenCalledWith(`${extensionsRoot}/my-extension`);
  });

  it("forgets a development extension without deleting the directory it was registered from", async () => {
    runInAction(() => {
      installedExtensions.set("dev-extension", {
        name: "dev-extension",
        path: "/home/someone/src/dev-extension",
        source: { kind: "directory", path: "/home/someone/src/dev-extension" },
        verified: false,
      });
    });
    readJsonFileMock.mockImplementation(async () => manifestOf("dev-extension", "0.1.0"));

    await extensionDiscovery.load();
    removePathMock.mockClear();

    await extensionDiscovery.uninstallExtension("dev-extension");

    expect(installedExtensions.has("dev-extension")).toBe(false);
    expect(removePathMock).not.toHaveBeenCalled();
  });
});
