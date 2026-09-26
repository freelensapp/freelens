/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { isErrnoException } from "@freelensapp/utilities";
import { ipcRenderer } from "electron";
import { makeObservable, observable, reaction, when } from "mobx";
import { rcompare, valid } from "semver";
import { broadcastMessage, ipcMainHandle, ipcRendererOn } from "../../common/ipc";
import { extensionDiscoveryStateChannel } from "../../common/ipc/extension-handling";
import { toJS } from "../../common/utils";
import { managedDirectoryOf } from "../../features/extensions/installer/common/managed-directory";
import { manifestFilename } from "../../features/extensions/installer/common/manifest";
import { parseVersionDirectoryName } from "../../features/extensions/installer/common/version-directory";
import { requestInitialExtensionDiscovery } from "../../renderer/ipc";

import type { Logger } from "@freelensapp/logger";
import type { TypedEventEmitter } from "@freelensapp/utilities";

import type { ObservableMap } from "mobx";

import type { EnsureDirectory } from "../../common/fs/ensure-dir.injectable";
import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { ReadDirectory } from "../../common/fs/read-directory.injectable";
import type { ReadJson } from "../../common/fs/read-json-file.injectable";
import type { RemovePath } from "../../common/fs/remove.injectable";
import type { Watch, Watcher } from "../../common/fs/watch/watch.injectable";
import type { GetBasenameOfPath } from "../../common/path/get-basename.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { IsExtensionEnabled } from "../../features/extensions/enabled/common/is-enabled.injectable";
import type { ForgetInstalledExtension } from "../../features/extensions/installer/common/forget-installed-extension.injectable";
import type { InstalledExtensionEntry } from "../../features/extensions/installer/common/installed-extensions";
import type { RecordInstalledExtension } from "../../features/extensions/installer/common/record-installed-extension.injectable";
import type { SweepOrphanedExtensionBuilds } from "../../features/extensions/installer/common/sweep-orphaned-builds.injectable";
import type { ExtensionLoader } from "../extension-loader";
import type { InstalledExtension, LensExtensionId, LensExtensionManifest } from "../installed-extension";

interface Dependencies {
  readonly extensionLoader: ExtensionLoader;
  readonly extensionsRoot: string;
  readonly installedExtensions: ObservableMap<string, InstalledExtensionEntry>;
  readonly logger: Logger;
  isExtensionEnabled: IsExtensionEnabled;
  isCompatibleExtension: (manifest: LensExtensionManifest) => boolean;
  recordInstalledExtension: RecordInstalledExtension;
  forgetInstalledExtension: ForgetInstalledExtension;
  sweepOrphanedExtensionBuilds: SweepOrphanedExtensionBuilds;
  readJsonFile: ReadJson;
  pathExists: PathExists;
  removePath: RemovePath;
  watch: Watch;
  readDirectory: ReadDirectory;
  ensureDirectory: EnsureDirectory;
  joinPaths: JoinPaths;
  getBasenameOfPath: GetBasenameOfPath;
}

const logModule = "[EXTENSION-DISCOVERY]";

/**
 * How long to wait after a filesystem event below the extensions root before
 * rescanning. An extraction produces one event per file; the rescan only has to
 * happen after the last of them.
 */
const rescanDebounce = 300;

/**
 * How long to wait after a write to one of a development extension's entry
 * points before reloading it. A bundler writes the main and the renderer entry
 * separately, and one rebuild has to be one reload.
 */
const rebuildDebounce = 300;

interface ExtensionDiscoveryChannelMessage {
  isLoaded: boolean;
}

type ExtensionDiscoveryEvents = {
  add: (ext: InstalledExtension) => void;
  remove: (extId: LensExtensionId) => void;
  rebuild: (ext: InstalledExtension) => void;
};

/**
 * Resolves the extensions the user has installed against the filesystem.
 *
 * Every install is recorded in the installed-extension registry, so discovery
 * is the managed root plus the external paths that registry names, rather than
 * a scan of a single folder:
 *
 * - a managed install lives at `<extensionsRoot>/<sanitized-name>/<version>-<digest8>/`,
 *   and several builds of one extension can be on disk at once because deleting
 *   the superseded one is deferred. The registry says which is live.
 * - a development install is a directory registered in place, anywhere on the
 *   filesystem. The absence of a `<version>-<digest8>` segment is what marks it.
 *
 * The class emits events for added, removed and rebuilt extensions:
 * - "add": When an extension is added. The event is of type InstalledExtension
 * - "remove": When an extension is removed. The event is of type LensExtensionId
 * - "rebuild": When the files of a development install changed under us. The
 *   event is of type InstalledExtension
 */
export class ExtensionDiscovery {
  private loadStarted = false;
  private extensions: Map<LensExtensionId, InstalledExtension> = new Map();
  private rescanTimer: ReturnType<typeof setTimeout> | undefined;

  // True if extensions have been loaded from the disk after app startup
  @observable isLoaded = false;

  get whenLoaded() {
    return when(() => this.isLoaded);
  }

  public readonly events: TypedEventEmitter<ExtensionDiscoveryEvents> =
    new EventEmitter() as unknown as TypedEventEmitter<ExtensionDiscoveryEvents>;

  constructor(protected readonly dependencies: Dependencies) {
    makeObservable(this);
  }

  /**
   * The root of every managed install, e.g. "<userData>/extensions".
   */
  get extensionsRoot(): string {
    return this.dependencies.extensionsRoot;
  }

  /**
   * Initializes the class and setups the file watcher for added/removed local extensions.
   */
  async init(): Promise<void> {
    if (ipcRenderer) {
      await this.initRenderer();
    } else {
      await this.initMain();
    }
  }

  async initRenderer(): Promise<void> {
    const onMessage = ({ isLoaded }: ExtensionDiscoveryChannelMessage) => {
      this.isLoaded = isLoaded;
    };

    requestInitialExtensionDiscovery().then(onMessage);
    ipcRendererOn(extensionDiscoveryStateChannel, (_event, message: ExtensionDiscoveryChannelMessage) => {
      onMessage(message);
    });
  }

  async initMain(): Promise<void> {
    ipcMainHandle(extensionDiscoveryStateChannel, () => this.toJSON());

    reaction(
      () => this.toJSON(),
      () => {
        this.broadcast();
      },
    );

    // An install or an uninstall is a change to the registry, wherever it was
    // made from: the renderer drives the UI but only main resolves extensions.
    reaction(
      () => this.registryFingerprint(),
      () => this.scheduleRescan(),
    );
  }

  /**
   * A value which changes exactly when the set of live installs does, so the
   * rescan is not triggered by unrelated bookkeeping.
   */
  private registryFingerprint(): string {
    return Array.from(this.dependencies.installedExtensions.entries(), ([name, entry]) => `${name}\u0000${entry.path}`)
      .sort()
      .join("\u0001");
  }

  private _watch: Watcher<false> | undefined;

  /**
   * Watches the extensions root, so that a build extracted or deleted outside
   * the application is noticed.
   */
  async watchExtensions(): Promise<void> {
    this.dependencies.logger.info(`${logModule} watching extension add/remove in ${this.extensionsRoot}`);

    // Wait until .load() has been called and has been resolved
    await this.whenLoaded;

    this._watch = this.dependencies
      .watch(this.extensionsRoot, {
        // <root>/<name>/<version>-<digest>/package.json
        depth: 3,
        ignoreInitial: true,
        // Try to wait until the file has been completely copied.
        // The OS might emit an event for added file even it's not completely written to the file-system.
        awaitWriteFinish: {
          // Wait 300ms until the file size doesn't change to consider the file written.
          // For a small file like package.json this should be plenty of time.
          stabilityThreshold: 300,
        },
      })
      .on("add", this.handleWatchFileEvent)
      .on("unlink", this.handleWatchFileEvent)
      .on("unlinkDir", this.handleWatchDirectoryEvent);

    this.syncRebuildWatchers();
  }

  async stopWatchingExtensions() {
    this.dependencies.logger.info(`${logModule} stopping the watch for extensions`);

    if (this.rescanTimer) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = undefined;
    }

    for (const extensionId of [...this.rebuildWatchers.keys()]) {
      this.stopWatchingForRebuilds(extensionId);
    }

    await this._watch?.close();
  }

  private readonly rebuildWatchers = new Map<LensExtensionId, { watcher: Watcher<false>; entryPoints: string }>();
  private readonly rebuildTimers = new Map<LensExtensionId, ReturnType<typeof setTimeout>>();

  /**
   * Watch the entry points of every development install, so that rebuilding one
   * reloads it.
   *
   * The root watcher cannot do this. A development install is registered in
   * place at an arbitrary path outside the managed root -- those paths have no
   * common ancestor, so there is nothing to widen -- and a rebuild rewrites the
   * entry point rather than the manifest, which is the only file the root
   * watcher reacts to. `rescan()` cannot do it either: it compares paths, and a
   * rebuild leaves the path unchanged.
   *
   * One watcher per extension, established when it is discovered and closed
   * when it is forgotten. It watches the files the manifest names rather than
   * the extension's tree, so the intermediate files a bundler writes are not
   * events at all, and `awaitWriteFinish` keeps a half-written bundle from being
   * imported -- the same reason the root watcher uses it.
   */
  private syncRebuildWatchers(): void {
    const wanted = new Map<LensExtensionId, string[]>();

    for (const extension of this.extensions.values()) {
      if (extension.isManaged) {
        continue;
      }

      const entryPoints = this.entryPointPathsOf(extension);

      if (entryPoints.length > 0) {
        wanted.set(extension.id, entryPoints);
      }
    }

    for (const [extensionId, watched] of this.rebuildWatchers) {
      const entryPoints = wanted.get(extensionId);

      if (entryPoints && watched.entryPoints === entryPoints.join("\u0000")) {
        // Already watching exactly these files.
        wanted.delete(extensionId);
        continue;
      }

      this.stopWatchingForRebuilds(extensionId);
    }

    for (const [extensionId, entryPoints] of wanted) {
      this.watchForRebuilds(extensionId, entryPoints);
    }
  }

  /**
   * The absolute paths of the entry points an extension's manifest names. A
   * manifest may name neither, in which case there is nothing to watch and the
   * extension has no code to reload.
   */
  private entryPointPathsOf({ absolutePath, manifest }: InstalledExtension): string[] {
    return [manifest.main, manifest.renderer]
      .filter((entryPoint): entryPoint is string => Boolean(entryPoint))
      .map((entryPoint) => this.dependencies.joinPaths(absolutePath, entryPoint));
  }

  private watchForRebuilds(extensionId: LensExtensionId, entryPoints: string[]): void {
    this.dependencies.logger.info(`${logModule} watching ${entryPoints.join(", ")} for rebuilds of ${extensionId}`);

    const watcher = this.dependencies
      .watch(entryPoints, {
        depth: 0,
        ignoreInitial: true,
        // A bundler writes an entry point in pieces, and importing half of one
        // fails in a way that looks like the extension's fault.
        awaitWriteFinish: {
          stabilityThreshold: 300,
        },
      })
      // A bundler which replaces the file rather than rewriting it takes the
      // watched path away and puts it back, so both events mean "rebuilt".
      .on("add", () => this.scheduleRebuild(extensionId))
      .on("change", () => this.scheduleRebuild(extensionId));

    this.rebuildWatchers.set(extensionId, { watcher, entryPoints: entryPoints.join("\u0000") });
  }

  private stopWatchingForRebuilds(extensionId: LensExtensionId): void {
    const timer = this.rebuildTimers.get(extensionId);

    if (timer) {
      clearTimeout(timer);
      this.rebuildTimers.delete(extensionId);
    }

    const watched = this.rebuildWatchers.get(extensionId);

    if (!watched) {
      return;
    }

    this.rebuildWatchers.delete(extensionId);

    void watched.watcher.close().catch((error: unknown) => {
      this.dependencies.logger.warn(`${logModule}: failed to stop watching ${extensionId} for rebuilds: ${error}`);
    });
  }

  private scheduleRebuild(extensionId: LensExtensionId): void {
    const timer = this.rebuildTimers.get(extensionId);

    if (timer) {
      clearTimeout(timer);
    }

    this.rebuildTimers.set(
      extensionId,
      setTimeout(() => {
        this.rebuildTimers.delete(extensionId);

        const extension = this.extensions.get(extensionId);

        if (!extension) {
          return;
        }

        this.dependencies.logger.info(`${logModule} ${extension.manifest.name} was rebuilt`);
        this.events.emit("rebuild", extension);
      }, rebuildDebounce),
    );
  }

  /**
   * Only a manifest appearing or disappearing can change what is installed, so
   * the other files an extraction writes are ignored.
   */
  handleWatchFileEvent = (filePath: string): void => {
    if (this.dependencies.getBasenameOfPath(filePath) === manifestFilename) {
      this.scheduleRescan();
    }
  };

  /**
   * A directory going away takes its manifest with it, and chokidar does not
   * report the files below it individually.
   */
  handleWatchDirectoryEvent = (): void => {
    this.scheduleRescan();
  };

  private scheduleRescan(): void {
    if (!this.isLoaded) {
      return;
    }

    if (this.rescanTimer) {
      clearTimeout(this.rescanTimer);
    }

    this.rescanTimer = setTimeout(() => {
      this.rescanTimer = undefined;
      void this.rescan();
    }, rescanDebounce);
  }

  /**
   * Resolve the installs again and emit the difference.
   *
   * A build becoming live under the same name is a remove followed by an add:
   * the loader holds an instance per extension, constructed from one particular
   * directory.
   */
  private async rescan(): Promise<void> {
    try {
      const discovered = await this.discoverExtensions();

      for (const [id, extension] of this.extensions) {
        const replacement = discovered.get(id);

        if (replacement && replacement.absolutePath === extension.absolutePath) {
          continue;
        }

        this.extensions.delete(id);
        this.dependencies.logger.info(`${logModule} removed extension ${extension.manifest.name}`);
        this.events.emit("remove", id);
      }

      for (const [id, extension] of discovered) {
        if (this.extensions.has(id)) {
          continue;
        }

        this.extensions.set(id, extension);
        this.dependencies.logger.info(`${logModule} added extension ${extension.manifest.name}`);
        this.events.emit("add", extension);
      }

      // An install or an uninstall changes which development extensions there
      // are to watch, and a reinstall at another path changes what to watch of
      // one which stayed.
      this.syncRebuildWatchers();

      await this.dependencies.sweepOrphanedExtensionBuilds(this.pathsToKeep());
    } catch (error) {
      this.dependencies.logger.error(`${logModule}: failed to rescan extensions: ${error}`, { error });
    }
  }

  /**
   * Uninstalls extension.
   *
   * A managed install is removed from disk with every build of it; a development
   * install is only forgotten. Symmetry invites the opposite, but the directory
   * of a development install belongs to its author.
   */
  async uninstallExtension(extensionId: LensExtensionId): Promise<void> {
    const extension =
      this.extensions.get(extensionId) ?? this.dependencies.extensionLoader.getExtensionById(extensionId);

    if (!extension) {
      return void this.dependencies.logger.warn(`${logModule} could not uninstall extension, not found`, {
        id: extensionId,
      });
    }

    const { manifest, absolutePath } = extension;

    this.dependencies.logger.info(`${logModule} Uninstalling ${manifest.name}`);

    this.dependencies.forgetInstalledExtension(extension.id);

    const managedDirectory = managedDirectoryOf(this.extensionsRoot, absolutePath);

    if (managedDirectory) {
      // fs.remove does nothing if the path doesn't exist anymore
      await this.dependencies.removePath(managedDirectory);
    } else {
      this.dependencies.logger.info(
        `${logModule} ${manifest.name} was registered in place, forgetting ${absolutePath} rather than deleting it`,
      );
    }
  }

  async load(): Promise<Map<LensExtensionId, InstalledExtension>> {
    if (this.loadStarted) {
      // The class is simplified by only supporting .load() to be called once
      throw new Error("ExtensionDiscovery.load() can be only be called once");
    }

    this.loadStarted = true;

    this.dependencies.logger.info(`${logModule} loading extensions from ${this.extensionsRoot}`);

    await this.dependencies.ensureDirectory(this.extensionsRoot);

    this.extensions = await this.discoverExtensions();

    // Nothing is loaded yet, so every build which is not live is an orphan left
    // by a deferred deletion that never completed.
    await this.dependencies.sweepOrphanedExtensionBuilds(this.pathsToKeep());

    this.isLoaded = true;

    return this.extensions;
  }

  /**
   * The builds the sweep must not collect: the live ones, plus the ones the
   * last scan could not rule out.
   *
   * The sweep deletes every version directory it is not given, so it is only
   * ever told about builds we are sure of. Deciding by omission would make
   * deletion the outcome of not knowing, which is how an extension gets
   * uninstalled without anybody asking for it.
   */
  private pathsToKeep(): string[] {
    return [...this.livePaths(), ...this.retainedBuilds];
  }

  private livePaths(): string[] {
    return Array.from(this.extensions.values(), ({ absolutePath }) => absolutePath);
  }

  /**
   * Builds which are not live but which the sweep may not touch yet, because
   * the scan resolved their directory by inference rather than from a record.
   * Once that inference has been written back they are ordinary orphans and the
   * next scan gives them up.
   */
  private retainedBuilds: ReadonlySet<string> = new Set();

  protected async discoverExtensions(): Promise<Map<LensExtensionId, InstalledExtension>> {
    const discovered = new Map<LensExtensionId, InstalledExtension>();
    const entriesByPath = new Map(
      Array.from(this.dependencies.installedExtensions.values(), (entry) => [entry.path, entry]),
    );

    // The recorded external paths: development installs, which live wherever
    // their author keeps them.
    for (const entry of this.dependencies.installedExtensions.values()) {
      if (managedDirectoryOf(this.extensionsRoot, entry.path)) {
        continue;
      }

      const extension = await this.loadExtensionFromDirectory(entry.path, entry);

      if (extension) {
        discovered.set(extension.id, extension);
      } else {
        this.dependencies.logger.warn(
          `${logModule}: ${entry.name} is recorded at ${entry.path} but cannot be loaded from there`,
        );
      }
    }

    const { extensions, retained } = await this.scanManagedRoot(entriesByPath);

    for (const extension of extensions) {
      discovered.set(extension.id, extension);
    }

    this.retainedBuilds = retained;

    this.dependencies.logger.debug(`${logModule}: ${discovered.size} extensions discovered`, {
      extensionsRoot: this.extensionsRoot,
    });

    return discovered;
  }

  private async scanManagedRoot(
    entriesByPath: Map<string, InstalledExtensionEntry>,
  ): Promise<{ extensions: InstalledExtension[]; retained: Set<string> }> {
    const extensions: InstalledExtension[] = [];
    const retained = new Set<string>();

    for (const directoryName of await this.readDirectories(this.extensionsRoot)) {
      const extensionDirectory = this.dependencies.joinPaths(this.extensionsRoot, directoryName);
      const builds = await this.findBuilds(extensionDirectory);
      const recorded = builds.find((build) => entriesByPath.has(build));

      // A record says which build is live and the rest are orphans of a deferred
      // deletion. Without one the newest build is adopted instead: an install
      // whose record was lost still works, and since the sweep removes every
      // build it is not given, declining to choose here would delete all of
      // them -- the working one included.
      const candidates = recorded ? [recorded] : this.orderBuildsByVersionDescending(builds);
      const adopted = await this.loadFirstLoadable(candidates, entriesByPath);

      if (!adopted) {
        if (builds.length > 0) {
          this.dependencies.logger.warn(
            `${logModule}: nothing below ${extensionDirectory} could be loaded, keeping its ${builds.length} builds`,
          );
        }

        // A manifest which cannot be read may be a corrupt build or may be a
        // transient error, and the two are indistinguishable from here. Neither
        // is a reason to delete anything.
        for (const build of builds) {
          retained.add(build);
        }

        continue;
      }

      extensions.push(adopted.extension);

      if (!recorded) {
        this.adopt(adopted.extension);

        // The builds which were passed over lost to an inference rather than to
        // a record. They are kept until that inference has been written back
        // and read again, so that one wrong guess cannot take the disk with it.
        for (const build of builds) {
          if (build !== adopted.path) {
            retained.add(build);
          }
        }
      }
    }

    return { extensions, retained };
  }

  private async loadFirstLoadable(
    builds: string[],
    entriesByPath: Map<string, InstalledExtensionEntry>,
  ): Promise<{ extension: InstalledExtension; path: string } | undefined> {
    for (const build of builds) {
      const extension = await this.loadExtensionFromDirectory(build, entriesByPath.get(build));

      if (extension) {
        return { extension, path: build };
      }
    }

    return undefined;
  }

  /**
   * Newest build first, which is the one a lost record most likely pointed at:
   * a build is only superseded by a later install.
   *
   * A version which is not valid semver sorts after the ones which are, and
   * equal versions are separated by their digest, so the order is total and does
   * not depend on how the directory happened to be read.
   */
  private orderBuildsByVersionDescending(builds: string[]): string[] {
    const versionOf = (build: string): string | undefined => {
      const version = parseVersionDirectoryName(this.dependencies.getBasenameOfPath(build))?.version;

      return version && valid(version) ? version : undefined;
    };

    return [...builds].sort((left, right) => {
      const leftVersion = versionOf(left);
      const rightVersion = versionOf(right);

      if (leftVersion && rightVersion && leftVersion !== rightVersion) {
        return rcompare(leftVersion, rightVersion);
      }

      if (Boolean(leftVersion) !== Boolean(rightVersion)) {
        return leftVersion ? -1 : 1;
      }

      return right.localeCompare(left);
    });
  }

  /**
   * Record a build found on disk which the registry does not know about, so
   * that the next scan does not have to infer it again and the sweep does not
   * collect it.
   */
  private adopt(extension: InstalledExtension): void {
    if (this.dependencies.installedExtensions.get(extension.id)?.path === extension.absolutePath) {
      return;
    }

    this.dependencies.logger.info(
      `${logModule}: adopting unrecorded extension ${extension.manifest.name} at ${extension.absolutePath}`,
    );

    const parsed = parseVersionDirectoryName(this.dependencies.getBasenameOfPath(extension.absolutePath));

    this.dependencies.recordInstalledExtension({
      name: extension.id,
      path: extension.absolutePath,
      version: parsed?.version,
      digest: parsed?.digest,
      verified: false,
    });
  }

  /**
   * The directories below `<extensionsRoot>/<name>` which could be the live
   * build: either the managed builds, or the directory itself when an unpacked
   * extension was put directly into the root.
   */
  private async findBuilds(extensionDirectory: string): Promise<string[]> {
    if (await this.dependencies.pathExists(this.dependencies.joinPaths(extensionDirectory, manifestFilename))) {
      return [extensionDirectory];
    }

    return (await this.readDirectories(extensionDirectory))
      .filter((name) => parseVersionDirectoryName(name))
      .map((name) => this.dependencies.joinPaths(extensionDirectory, name));
  }

  private async readDirectories(directory: string): Promise<string[]> {
    try {
      const entries = await this.dependencies.readDirectory(directory, { withFileTypes: true });

      // A symbolic link is followed: this model has no symlinks of its own, but
      // a user is free to point one at a checkout.
      return entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => entry.name);
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") {
        this.dependencies.logger.warn(`${logModule}: cannot read ${directory}: ${error}`);
      }

      return [];
    }
  }

  /**
   * Returns the InstalledExtension for a directory holding a manifest, or null
   * when there is nothing loadable there.
   */
  protected async loadExtensionFromDirectory(
    directory: string,
    entry?: InstalledExtensionEntry,
  ): Promise<InstalledExtension | null> {
    const manifestPath = this.dependencies.joinPaths(directory, manifestFilename);

    try {
      const manifest = (await this.dependencies.readJsonFile(manifestPath)) as unknown as LensExtensionManifest;
      const id = manifest.name;
      const isManaged = Boolean(parseVersionDirectoryName(this.dependencies.getBasenameOfPath(directory)));

      return {
        id,
        absolutePath: directory,
        manifestPath,
        manifest,
        isEnabled: this.dependencies.isExtensionEnabled(id),
        isCompatible: this.dependencies.isCompatibleExtension(manifest),
        isManaged,
        isVerified: isManaged && entry?.verified === true,
      };
    } catch (error) {
      if (isErrnoException(error) && (error.code === "ENOTDIR" || error.code === "ENOENT")) {
        // ignore this error, probably from .DS_Store file
        this.dependencies.logger.debug(
          `${logModule}: failed to load extension manifest through a not-dir-like at ${manifestPath}`,
        );
      } else {
        this.dependencies.logger.error(`${logModule}: can't load extension manifest at ${manifestPath}: ${error}`);
      }

      return null;
    }
  }

  toJSON(): ExtensionDiscoveryChannelMessage {
    return toJS({
      isLoaded: this.isLoaded,
    });
  }

  broadcast(): void {
    broadcastMessage(extensionDiscoveryStateChannel, this.toJSON());
  }
}
