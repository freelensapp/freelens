/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { delay } from "@freelensapp/utilities";
import { observable, runInAction, when } from "mobx";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import ensureDirInjectable from "../../common/fs/ensure-dir.injectable";
import lstatInjectable from "../../common/fs/lstat.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../common/fs/path-exists-sync.injectable";
import readDirectoryInjectable from "../../common/fs/read-directory.injectable";
import readJsonFileInjectable from "../../common/fs/read-json-file.injectable";
import readJsonSyncInjectable from "../../common/fs/read-json-sync.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import watchInjectable from "../../common/fs/watch/watch.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import homeDirectoryPathInjectable from "../../common/os/home-directory-path.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import extensionApiVersionInjectable from "../../common/vars/extension-api-version.injectable";
import isProductionInjectable from "../../common/vars/is-production.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import extensionDiscoveryInjectable from "../extension-discovery/extension-discovery.injectable";
import forkPnpmInjectable from "../install-extension/fork-pnpm.injectable";
import installExtensionInjectable from "../install-extension/install-extension.injectable";

import type { FSWatcher } from "chokidar";

import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { ExtensionDiscovery } from "../extension-discovery/extension-discovery";

describe("ExtensionDiscovery", () => {
  let extensionDiscovery: ExtensionDiscovery;
  let readJsonFileMock: jest.Mock;
  let pathExistsMock: jest.Mock;
  let watchMock: jest.Mock;
  let installExtensionMock: jest.Mock;
  let readDirectoryMock: jest.Mock;
  let forkPnpmMock: jest.Mock;
  let removePathMock: jest.Mock;
  let joinPaths: JoinPaths;
  let homeDirectoryPath: string;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    installExtensionMock = jest.fn().mockResolvedValue(undefined);
    di.override(installExtensionInjectable, () => installExtensionMock);
    di.override(isProductionInjectable, () => false);
    di.override(ensureDirInjectable, () => jest.fn().mockResolvedValue(undefined));
    di.override(lstatInjectable, () => jest.fn().mockResolvedValue({ isDirectory: () => true }));
    di.override(statInjectable, () => jest.fn().mockResolvedValue({ size: 20 }));
    readDirectoryMock = jest.fn().mockResolvedValue([]);
    di.override(readDirectoryInjectable, () => readDirectoryMock);
    forkPnpmMock = jest.fn().mockResolvedValue(undefined);
    di.override(forkPnpmInjectable, () => forkPnpmMock);
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

    joinPaths = di.inject(joinPathsInjectable);
    homeDirectoryPath = di.inject(homeDirectoryPathInjectable);

    readJsonFileMock = jest.fn();
    di.override(readJsonFileInjectable, () => readJsonFileMock);

    pathExistsMock = jest.fn(() => Promise.resolve(true));
    di.override(pathExistsInjectable, () => pathExistsMock);

    watchMock = jest.fn();
    di.override(watchInjectable, () => watchMock);

    removePathMock = jest.fn().mockResolvedValue(undefined);
    di.override(removePathInjectable, () => removePathMock);

    extensionDiscovery = di.inject(extensionDiscoveryInjectable);
  });

  describe("local extension links", () => {
    const names = ["first-extension", "@publisher/second-extension"];
    const folders = ["first-folder", "second-folder"];

    beforeEach(() => {
      readDirectoryMock.mockResolvedValue(folders);
      readJsonFileMock.mockImplementation(async (manifestPath) => {
        const index = folders.findIndex(
          (folder) => manifestPath === joinPaths(extensionDiscovery.localFolderPath, folder, "package.json"),
        );

        if (index < 0) {
          throw new Error(`Unexpected manifest path: ${manifestPath}`);
        }

        return { name: names[index], version: "1.0.0", engines: { freelens: "0.1.0" } };
      });
    });

    it.each([
      false,
      true,
    ])("reconciles all extensions when some or all links are missing (first exists: %s)", async (firstExists) => {
      pathExistsMock.mockImplementation(
        async (path) => firstExists && path === joinPaths(extensionDiscovery.nodeModulesPath, names[0]),
      );
      installExtensionMock.mockImplementation(async () => {
        expect(extensionDiscovery.isLoaded).toBe(false);
      });

      const extensions = await extensionDiscovery.load();

      expect(installExtensionMock).toHaveBeenCalledTimes(1);
      expect(installExtensionMock).toHaveBeenCalledWith({
        paths: folders.map((folder) => joinPaths(extensionDiscovery.localFolderPath, folder)),
        packageJsonPath: extensionDiscovery.packageJsonPath,
      });
      expect([...extensions.values()].map((extension) => extension.manifest.name)).toEqual(names);
      expect([...extensions.values()].map((extension) => extension.absolutePath)).toEqual(
        folders.map((folder) => joinPaths(extensionDiscovery.localFolderPath, folder)),
      );
      for (const name of names) {
        expect(pathExistsMock).toHaveBeenCalledWith(joinPaths(extensionDiscovery.nodeModulesPath, name));
      }
      // Manifests are read from the source folders only; the links are checked, not re-read.
      expect(readJsonFileMock).toHaveBeenCalledTimes(2);
      expect(extensionDiscovery.isLoaded).toBe(true);
    });

    it("skips installation when every installed path exists", async () => {
      const extensions = await extensionDiscovery.load();

      expect(extensions.size).toBe(2);
      expect(installExtensionMock).not.toHaveBeenCalled();
      expect(readJsonFileMock).toHaveBeenCalledTimes(2);
    });

    it("skips installation when no extensions are discovered", async () => {
      readDirectoryMock.mockResolvedValue([]);

      expect((await extensionDiscovery.load()).size).toBe(0);
      expect(installExtensionMock).not.toHaveBeenCalled();
    });

    it("includes existing paths when a new extension is added", async () => {
      await extensionDiscovery.load();
      const newPath = joinPaths(extensionDiscovery.localFolderPath, "new-folder");
      readJsonFileMock.mockResolvedValueOnce({
        name: "new-extension",
        version: "1.0.0",
        engines: { freelens: "0.1.0" },
      });
      const onAdd = jest.fn();
      extensionDiscovery.events.on("add", onAdd);

      await extensionDiscovery.handleWatchFileAdd(joinPaths(newPath, "package.json"));

      expect(installExtensionMock).toHaveBeenCalledTimes(1);
      expect(installExtensionMock).toHaveBeenCalledWith({
        paths: [...folders.map((folder) => joinPaths(extensionDiscovery.localFolderPath, folder)), newPath],
        packageJsonPath: extensionDiscovery.packageJsonPath,
      });
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ absolutePath: newPath }));
    });

    it("still reinstalls before uninstalling by package name", async () => {
      const extensions = await extensionDiscovery.load();
      const extension = [...extensions.values()][0];

      await extensionDiscovery.uninstallExtension(extension.id);

      expect(forkPnpmMock.mock.calls).toEqual([
        ["install", "--prefer-offline", "--prod", "--force"],
        ["uninstall", "--force", names[0]],
      ]);
      expect(removePathMock).toHaveBeenCalledWith(joinPaths(extensionDiscovery.nodeModulesPath, names[0]));
      expect(removePathMock).toHaveBeenCalledWith(extension.absolutePath);
    });
  });

  it("emits add for added extension", async () => {
    const letTestFinish = observable.box(false);
    let addHandler!: (filePath: string) => void;

    readJsonFileMock.mockImplementation((p) => {
      expect(p).toBe(joinPaths(homeDirectoryPath, ".freelens/extensions/my-extension/package.json"));

      return {
        name: "my-extension",
        version: "1.0.0",
        engines: {
          freelens: "0.1.0",
        },
      };
    });

    const mockWatchInstance = {
      on: jest.fn((event: string, handler: typeof addHandler) => {
        if (event === "add") {
          addHandler = handler;
        }

        return mockWatchInstance;
      }),
    } as unknown as FSWatcher;

    watchMock.mockImplementationOnce(() => mockWatchInstance);

    // Need to force isLoaded to be true so that the file watching is started
    extensionDiscovery.isLoaded = true;

    await extensionDiscovery.watchExtensions();

    extensionDiscovery.events.on("add", (extension) => {
      expect(extension).toEqual({
        absolutePath: expect.any(String),
        id: "/some-directory-for-user-data/node_modules/my-extension/package.json",
        isBundled: false,
        isEnabled: false,
        isCompatible: true,
        manifest: {
          name: "my-extension",
          version: "1.0.0",
          engines: {
            freelens: "0.1.0",
          },
        },
        manifestPath: "/some-directory-for-user-data/node_modules/my-extension/package.json",
      });
      runInAction(() => letTestFinish.set(true));
    });

    addHandler(joinPaths(extensionDiscovery.localFolderPath, "/my-extension/package.json"));
    await when(() => letTestFinish.get());
  });

  it("doesn't emit add for added file under extension", async () => {
    let addHandler!: (filePath: string) => void;

    const mockWatchInstance = {
      on: jest.fn((event: string, handler: typeof addHandler) => {
        if (event === "add") {
          addHandler = handler;
        }

        return mockWatchInstance;
      }),
    } as unknown as FSWatcher;

    watchMock.mockImplementationOnce(() => mockWatchInstance);

    // Need to force isLoaded to be true so that the file watching is started
    extensionDiscovery.isLoaded = true;

    await extensionDiscovery.watchExtensions();

    const onAdd = jest.fn();

    extensionDiscovery.events.on("add", onAdd);

    addHandler(joinPaths(extensionDiscovery.localFolderPath, "/my-extension/node_modules/dep/package.json"));

    await delay(10);

    expect(onAdd).not.toHaveBeenCalled();
  });
});
