/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { isErrnoException } from "@freelensapp/utilities";
import { ipcRenderer } from "electron";
import { makeObservable, observable, reaction, when } from "mobx";
import { broadcastMessage, ipcMainHandle, ipcRendererOn } from "../../common/ipc";
import { extensionDiscoveryStateChannel } from "../../common/ipc/extension-handling";
import { toJS } from "../../common/utils";
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
import type { GetRelativePath } from "../../common/path/get-relative-path.injectable";
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
  getRelativePath: GetRelativePath;
}

const logModule = "[EXTENSION-DISCOVERY]";

export const manifestFilename = "package.json";

/**
 * How long to wait after a filesystem event below the extensions root before
 * rescanning. An extraction produces one event per file; the rescan only has to
 * happen after the last of them.
 */
const rescanDebounce = 300;

interface ExtensionDiscoveryChannelMessage {
  isLoaded: boolean;
}

type ExtensionDiscoveryEvents = {
  add: (ext: InstalledExtension) => void;
  remove: (extId: LensExtensionId) => void;
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
 * The class emits events for added and removed extensions:
 * - "add": When an extension is added. The event is of type InstalledExtension
 * - "remove": When an extension is removed. The event is of type LensExtensionId
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
  }

  async stopWatchingExtensions() {
    this.dependencies.logger.info(`${logModule} stopping the watch for extensions`);

    if (this.rescanTimer) {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = undefined;
    }

    await this._watch?.close();
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

      await this.dependencies.sweepOrphanedExtensionBuilds(this.livePaths());
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

    const managedDirectory = this.managedDirectoryOf(absolutePath);

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
    await this.dependencies.sweepOrphanedExtensionBuilds(this.livePaths());

    this.isLoaded = true;

    return this.extensions;
  }

  private livePaths(): string[] {
    return Array.from(this.extensions.values(), ({ absolutePath }) => absolutePath);
  }

  /**
   * The `<extensionsRoot>/<directory>` an install belongs to, or `undefined`
   * when the path is outside the root and therefore not ours to delete.
   */
  private managedDirectoryOf(installPath: string): string | undefined {
    const relativePath = this.dependencies.getRelativePath(this.extensionsRoot, installPath);

    if (!relativePath || relativePath.startsWith("..") || this.isAbsolutePath(relativePath)) {
      return undefined;
    }

    const [directoryName] = relativePath.split(/[\\/]/);

    return directoryName ? this.dependencies.joinPaths(this.extensionsRoot, directoryName) : undefined;
  }

  private isAbsolutePath(candidate: string): boolean {
    return candidate.startsWith("/") || /^[a-z]:[\\/]/i.test(candidate);
  }

  protected async discoverExtensions(): Promise<Map<LensExtensionId, InstalledExtension>> {
    const discovered = new Map<LensExtensionId, InstalledExtension>();
    const entriesByPath = new Map(
      Array.from(this.dependencies.installedExtensions.values(), (entry) => [entry.path, entry]),
    );

    // The recorded external paths: development installs, which live wherever
    // their author keeps them.
    for (const entry of this.dependencies.installedExtensions.values()) {
      if (this.managedDirectoryOf(entry.path)) {
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

    for (const extension of await this.scanManagedRoot(entriesByPath)) {
      discovered.set(extension.id, extension);
    }

    this.dependencies.logger.debug(`${logModule}: ${discovered.size} extensions discovered`, {
      extensionsRoot: this.extensionsRoot,
    });

    return discovered;
  }

  private async scanManagedRoot(entriesByPath: Map<string, InstalledExtensionEntry>): Promise<InstalledExtension[]> {
    const extensions: InstalledExtension[] = [];

    for (const directoryName of await this.readDirectories(this.extensionsRoot)) {
      const extensionDirectory = this.dependencies.joinPaths(this.extensionsRoot, directoryName);
      const builds = await this.findBuilds(extensionDirectory);
      const recorded = builds.find((build) => entriesByPath.has(build));

      // Without a record there is nothing to pick between builds, and guessing
      // would be worse than leaving them to the sweep. A single build is not a
      // guess, so it is adopted: an install whose record was lost still works.
      const livePath = recorded ?? (builds.length === 1 ? builds[0] : undefined);

      if (!livePath) {
        if (builds.length > 0) {
          this.dependencies.logger.warn(
            `${logModule}: ${extensionDirectory} holds ${builds.length} builds and none of them is recorded as live`,
          );
        }

        continue;
      }

      const extension = await this.loadExtensionFromDirectory(livePath, entriesByPath.get(livePath));

      if (!extension) {
        continue;
      }

      extensions.push(extension);

      if (!recorded) {
        this.adopt(extension);
      }
    }

    return extensions;
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
