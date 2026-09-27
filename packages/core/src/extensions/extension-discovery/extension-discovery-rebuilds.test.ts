/**
 * Copyright (c) Freelens Authors. All rights reserved.
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

import type { InstalledExtension } from "../installed-extension";
import type { ExtensionDiscovery } from "./extension-discovery";

const extensionsRoot = "/some-directory-for-user-data/extensions";
const developmentPath = "/home/someone/src/dev-extension";

const directoryEntry = (name: string) =>
  ({
    name,
    isDirectory: () => true,
    isSymbolicLink: () => false,
  }) as Dirent;

const manifestOf = (name: string, version: string) => ({
  name,
  version,
  engines: { freelens: "0.1.0" },
  main: "dist/main.js",
  renderer: "dist/renderer.js",
});

/**
 * A stand-in for chokidar which remembers what it was asked to watch and lets a
 * test emit into it.
 */
class FakeWatcher {
  readonly handlers = new Map<string, ((path: string) => void)[]>();
  readonly closed = vi.fn(async () => {});

  constructor(readonly paths: string | string[]) {}

  on(event: string, handler: (path: string) => void): this {
    const handlers = this.handlers.get(event) ?? [];

    handlers.push(handler);
    this.handlers.set(event, handlers);

    return this;
  }

  emit(event: string, path: string): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(path);
    }
  }

  close(): Promise<void> {
    return this.closed();
  }
}

describe("reloading a development extension when it is rebuilt", () => {
  let extensionDiscovery: ExtensionDiscovery;
  let watchers: FakeWatcher[];
  let rebuilt: InstalledExtension[];

  const watcherOf = (path: string) => watchers.find((watcher) => watcher.paths.includes(path));

  beforeEach(async () => {
    vi.useFakeTimers();

    watchers = [];
    rebuilt = [];

    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(extensionApiVersionInjectable, () => "0.1.0");
    di.override(pathExistsSyncInjectable, () => () => false);
    di.override(readJsonSyncInjectable, () => () => ({}));
    di.override(writeJsonSyncInjectable, () => () => {});
    di.override(pathExistsInjectable, () => async () => false);
    di.override(removePathInjectable, () => async () => {});
    di.override(ensureDirInjectable, () => async () => {});
    di.override(
      readDirectoryInjectable,
      () =>
        vi.fn(async (directory: string) =>
          directory === extensionsRoot
            ? [directoryEntry("managed-extension")]
            : directory === `${extensionsRoot}/managed-extension`
              ? [directoryEntry("1.0.0-abcdef01")]
              : [],
        ) as never,
    );
    di.override(
      readJsonFileInjectable,
      () => async (path: string) =>
        manifestOf(path.startsWith(developmentPath) ? "dev-extension" : "managed-extension", "0.1.0"),
    );
    di.override(
      watchInjectable,
      () =>
        ((paths: string | string[]) => {
          const watcher = new FakeWatcher(paths);

          watchers.push(watcher);

          return watcher;
        }) as never,
    );

    const installedExtensions = di.inject(installedExtensionsStateInjectable);

    runInAction(() => {
      installedExtensions.set("dev-extension", {
        name: "dev-extension",
        path: developmentPath,
        source: { kind: "directory", path: developmentPath },
        verified: false,
      });
    });

    extensionDiscovery = di.inject(extensionDiscoveryInjectable);
    extensionDiscovery.events.on("rebuild", (extension) => {
      rebuilt.push(extension);
    });

    await extensionDiscovery.load();
    await extensionDiscovery.watchExtensions();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("watches the entry points the manifest names, at the external path", () => {
    expect(watcherOf(`${developmentPath}/dist/renderer.js`)?.paths).toEqual([
      `${developmentPath}/dist/main.js`,
      `${developmentPath}/dist/renderer.js`,
    ]);
  });

  it("emits a rebuild when an entry point is rewritten", () => {
    watcherOf(`${developmentPath}/dist/main.js`)?.emit("change", `${developmentPath}/dist/main.js`);

    vi.advanceTimersByTime(300);

    expect(rebuilt.map(({ id }) => id)).toEqual(["dev-extension"]);
  });

  it("emits a rebuild when an entry point is replaced rather than rewritten", () => {
    watcherOf(`${developmentPath}/dist/main.js`)?.emit("add", `${developmentPath}/dist/main.js`);

    vi.advanceTimersByTime(300);

    expect(rebuilt.map(({ id }) => id)).toEqual(["dev-extension"]);
  });

  it("emits one rebuild for one build, which writes every entry point it has", () => {
    const watcher = watcherOf(`${developmentPath}/dist/main.js`);

    watcher?.emit("change", `${developmentPath}/dist/main.js`);
    vi.advanceTimersByTime(100);
    watcher?.emit("change", `${developmentPath}/dist/renderer.js`);
    vi.advanceTimersByTime(300);

    expect(rebuilt).toHaveLength(1);
  });

  it("does not watch a managed install, whose content cannot change without a new install", () => {
    expect(watchers.map(({ paths }) => paths)).toEqual([
      extensionsRoot,
      [`${developmentPath}/dist/main.js`, `${developmentPath}/dist/renderer.js`],
    ]);
  });

  it("stops watching for rebuilds when the watch is stopped", async () => {
    const watcher = watcherOf(`${developmentPath}/dist/main.js`);

    await extensionDiscovery.stopWatchingExtensions();

    expect(watcher?.closed).toHaveBeenCalled();
  });

  it("does not emit a rebuild scheduled before the watch was stopped", async () => {
    watcherOf(`${developmentPath}/dist/main.js`)?.emit("change", `${developmentPath}/dist/main.js`);

    await extensionDiscovery.stopWatchingExtensions();
    vi.advanceTimersByTime(300);

    expect(rebuilt).toHaveLength(0);
  });
});
