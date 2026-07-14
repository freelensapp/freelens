/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { createRequire } from "node:module";
import { EventEmitter } from "@freelensapp/event-emitter";
import { isDefined, iter } from "@freelensapp/utilities";
import { ipcMain, ipcRenderer } from "electron";
import { isEqual } from "es-toolkit";
import { action, computed, observable, reaction, runInAction, toJS, when } from "mobx";
import { broadcastMessage, ipcMainHandle, ipcMainOn, ipcRendererOn } from "../../common/ipc";
import {
  extensionLoaderFromMainChannel,
  extensionLoaderFromRendererChannel,
} from "../../common/ipc/extension-handling";
import { requestExtensionLoaderInitialState } from "../../renderer/ipc";

import type { Logger } from "@freelensapp/logger";

import type { ObservableMap } from "mobx";

import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { ReadFile } from "../../common/fs/read-file.injectable";
import type { GetDirnameOfPath } from "../../common/path/get-dirname.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { UpdateExtensionsState } from "../../features/extensions/enabled/common/update-state.injectable";
import type {
  InstalledExtension,
  LensExtensionConstructor,
  LensExtensionId,
  LensExtensionInstance,
} from "../installed-extension";
import type { LensExtension } from "../lens-extension";
import type { Extension } from "./extension/extension.injectable";

const logModule = "[EXTENSIONS-LOADER]";

// v2 (plan D2/D6): the bundles are ESM, where the main process has no
// `require` global; the node-integrated renderer keeps it. Node 24's
// require(esm) loads both CJS and ESM extension entry points synchronously
// (verified empirically in #1718), so a sync loader keeps working for both
// module formats in both processes. Entry points with top-level await would
// need an async import() path in the main process; not supported for now.
const extensionRequire = globalThis.require ?? createRequire(import.meta.url);

interface Dependencies {
  readonly extensionInstances: ObservableMap<LensExtensionId, LensExtensionInstance>;
  readonly logger: Logger;
  readonly extensionEntryPointName: "main" | "renderer";
  updateExtensionsState: UpdateExtensionsState;
  getExtension: (instance: LensExtensionInstance) => Extension;
  joinPaths: JoinPaths;
  getDirnameOfPath: GetDirnameOfPath;
  readFile: ReadFile;
  pathExists: PathExists;
}

interface ExtensionBeingActivated {
  instance: LensExtension;
  installedExtension: InstalledExtension;
  activated: Promise<void>;
}

export interface ExtensionLoading {
  loaded: Promise<void>;
}

/**
 * Loads installed extensions to the Lens application
 */
export class ExtensionLoader {
  protected readonly extensions = observable.map<LensExtensionId, InstalledExtension>();

  /**
   * This is the set of extensions that don't come with either
   * - Main.LensExtension when running in the main process
   * - Renderer.LensExtension when running in the renderer process
   */
  protected readonly nonInstancesByName = observable.set<string>();

  protected readonly instancesByName = computed(
    () =>
      new Map(
        iter.chain(this.dependencies.extensionInstances.entries()).map(([, instance]) => [instance.name, instance]),
      ),
  );

  private readonly onRemoveExtensionId = new EventEmitter<[string]>();

  // Absolute paths of extension stylesheets already injected into the renderer
  // document, so a reload (the toJSON reaction re-requires user extensions)
  // does not append the same <style> twice.
  private readonly injectedStylePaths = new Set<string>();

  readonly isLoaded = observable.box(false);

  constructor(protected readonly dependencies: Dependencies) {}

  readonly userExtensions = computed(() => new Map(this.extensions.toJSON()));

  /**
   * Get the extension instance by its manifest name
   * @param name The name of the extension
   * @returns one of the following:
   * - the instance of `Main.LensExtension` on the main process if created
   * - the instance of `Renderer.LensExtension` on the renderer process if created
   * - `null` if no class definition is provided for the current process
   * - `undefined` if the name is not known about
   */
  getInstanceByName(name: string): LensExtensionInstance | null | undefined {
    if (this.nonInstancesByName.has(name)) {
      return null;
    }

    return this.instancesByName.get().get(name);
  }

  // Transform userExtensions to a state object for storing into ExtensionsStore
  readonly storeState = computed(() =>
    Array.from(
      this.userExtensions.get(),
      ([extId, extension]) =>
        [
          extId,
          {
            enabled: extension.isEnabled,
            name: extension.manifest.name,
          },
        ] as const,
    ),
  );

  async init() {
    if (ipcMain) {
      await this.initMain();
    } else {
      await this.initRenderer();
    }

    await when(() => this.isLoaded.get());

    // broadcasting extensions between main/renderer processes
    reaction(
      () => this.toJSON(),
      () => this.broadcastExtensions(),
      {
        fireImmediately: true,
      },
    );

    reaction(
      () => this.storeState.get(),
      (state) => {
        this.dependencies.updateExtensionsState(state);
      },
    );
  }

  initExtensions(extensions: Map<LensExtensionId, InstalledExtension>) {
    this.extensions.replace(extensions);
  }

  addExtension(extension: InstalledExtension) {
    this.extensions.set(extension.id, extension);
  }

  @action
  removeInstance(lensExtensionId: LensExtensionId) {
    this.dependencies.logger.info(`${logModule} deleting extension instance ${lensExtensionId}`);
    const instance = this.dependencies.extensionInstances.get(lensExtensionId);

    if (!instance) {
      return;
    }

    try {
      instance.disable();

      const extension = this.dependencies.getExtension(instance);

      extension.deregister();

      this.onRemoveExtensionId.emit(instance.id);
      this.dependencies.extensionInstances.delete(lensExtensionId);
      this.nonInstancesByName.delete(instance.name);
    } catch (error) {
      this.dependencies.logger.error(`${logModule}: deactivation extension error`, { lensExtensionId, error });
    }
  }

  removeExtension(lensExtensionId: LensExtensionId) {
    this.removeInstance(lensExtensionId);

    if (!this.extensions.delete(lensExtensionId)) {
      throw new Error(`Can't remove extension ${lensExtensionId}, doesn't exist.`);
    }
  }

  setIsEnabled(lensExtensionId: LensExtensionId, isEnabled: boolean) {
    const extension = this.extensions.get(lensExtensionId);

    assert(extension, `Extension "${lensExtensionId}" must be registered before it can be enabled.`);

    extension.isEnabled = isEnabled;
  }

  protected async initMain() {
    runInAction(() => {
      this.isLoaded.set(true);
    });

    await this.autoInitExtensions();

    ipcMainHandle(extensionLoaderFromMainChannel, () => [...this.toJSON()]);

    ipcMainOn(extensionLoaderFromRendererChannel, (event, extensions: [LensExtensionId, InstalledExtension][]) => {
      this.syncExtensions(extensions);
    });
  }

  protected async initRenderer() {
    const extensionListHandler = (extensions: [LensExtensionId, InstalledExtension][]) => {
      runInAction(() => {
        this.isLoaded.set(true);
      });
      this.syncExtensions(extensions);

      const receivedExtensionIds = extensions.map(([lensExtensionId]) => lensExtensionId);

      // Remove deleted extensions in renderer side only
      this.extensions.forEach((_, lensExtensionId) => {
        if (!receivedExtensionIds.includes(lensExtensionId)) {
          this.removeExtension(lensExtensionId);
        }
      });
    };

    requestExtensionLoaderInitialState().then(extensionListHandler);
    ipcRendererOn(extensionLoaderFromMainChannel, (event, extensions: [LensExtensionId, InstalledExtension][]) => {
      extensionListHandler(extensions);
    });
  }

  broadcastExtensions() {
    const channel = ipcRenderer ? extensionLoaderFromRendererChannel : extensionLoaderFromMainChannel;

    broadcastMessage(channel, Array.from(this.extensions));
  }

  syncExtensions(extensions: [LensExtensionId, InstalledExtension][]) {
    extensions.forEach(([lensExtensionId, extension]) => {
      if (!isEqual(this.extensions.get(lensExtensionId), extension)) {
        this.extensions.set(lensExtensionId, extension);
      }
    });
  }

  protected async loadExtensions(extensions: ExtensionBeingActivated[]): Promise<ExtensionLoading[]> {
    // We first need to wait until each extension's `onActivate` is resolved or rejected,
    // as this might register new catalog categories. Afterwards we can safely .enable the extension.
    await Promise.all(
      extensions.map((extension) =>
        // If extension activation fails, log error
        extension.activated.catch((error) => {
          this.dependencies.logger.error(`${logModule}: activation extension error`, {
            ext: extension.installedExtension,
            error,
          });
        }),
      ),
    );

    extensions.forEach(({ instance }) => {
      const extension = this.dependencies.getExtension(instance);

      extension.register();
    });

    return extensions.map((extension) => {
      const loaded = extension.instance.enable().catch((err) => {
        this.dependencies.logger.error(`${logModule}: failed to enable`, { ext: extension, err });
      });

      return { loaded };
    });
  }

  protected async loadUserExtensions(installedExtensions: Map<string, InstalledExtension>) {
    // Steps of the function:
    // 1. require and call .activate for each Extension
    // 2. Wait until every extension's onActivate has been resolved
    // 3. Call .enable for each extension
    // 4. Return ExtensionLoading[]

    return [...installedExtensions.entries()]
      .map(([extId, installedExtension]) => {
        const alreadyInit =
          this.dependencies.extensionInstances.has(extId) ||
          this.nonInstancesByName.has(installedExtension.manifest.name);

        if (installedExtension.isCompatible && installedExtension.isEnabled && !alreadyInit) {
          try {
            const LensExtensionClass = this.requireExtension(installedExtension);

            if (!LensExtensionClass) {
              this.nonInstancesByName.add(installedExtension.manifest.name);

              return null;
            }

            const instance = new LensExtensionClass(installedExtension);

            this.dependencies.extensionInstances.set(extId, instance);

            return {
              instance,
              installedExtension,
              activated: instance.activate(),
            } as ExtensionBeingActivated;
          } catch (err) {
            this.dependencies.logger.error(`${logModule}: error loading extension`, { ext: installedExtension, err });
          }
        } else if (!installedExtension.isEnabled && alreadyInit) {
          this.removeInstance(extId);
        }

        return null;
      })
      .filter(isDefined);
  }

  async autoInitExtensions() {
    this.dependencies.logger.info(`${logModule}: auto initializing extensions`);

    const userExtensions = await this.loadUserExtensions(this.toJSON());
    const loadedExtensions = await this.loadExtensions(userExtensions);

    // Setup reaction to load extensions on JSON changes
    reaction(
      () => this.toJSON(),
      (installedExtensions) => {
        void (async () => {
          const userExtensions = await this.loadUserExtensions(installedExtensions);

          await this.loadExtensions(userExtensions);
        })();
      },
    );

    return loadedExtensions;
  }

  protected requireExtension(extension: InstalledExtension): LensExtensionConstructor | null {
    const extRelativePath = extension.manifest[this.dependencies.extensionEntryPointName];

    if (!extRelativePath) {
      return null;
    }

    const extAbsolutePath = this.dependencies.joinPaths(
      this.dependencies.getDirnameOfPath(extension.manifestPath),
      extRelativePath,
    );

    try {
      const extensionModule = extensionRequire(extAbsolutePath);

      // Load the extension's renderer stylesheet, if any. Extensions are built
      // in Vite library mode, which extracts CSS to a sibling asset and injects
      // nothing (unlike the host's own application build). Without this, an
      // extension has to import its SCSS twice and inline it through a manual
      // `<style>` tag (see docs/v2-extension-migration.md). Fire-and-forget:
      // requiring the entry is synchronous, style injection is a side effect.
      void this.injectRendererStyles(extAbsolutePath, extension);

      return extensionModule.default;
    } catch (error) {
      const message = (error instanceof Error ? error.stack : undefined) || error;

      this.dependencies.logger.error(
        `${logModule}: can't load ${this.dependencies.extensionEntryPointName} for "${extension.manifest.name}": ${message}`,
        { extension },
      );
    }

    return null;
  }

  /**
   * Inject an extension's renderer stylesheet into the host document.
   *
   * Vite library builds emit the extension's CSS as an asset next to the
   * renderer entry (either `<entry>.css` or a `style.css` in the same folder)
   * but, unlike an application build, do not inject it. The host loads the
   * entry with `require()` and would otherwise never load that CSS. This reads
   * the sibling stylesheet and appends it as a `<style>` element, so plain
   * side-effect and CSS-module imports in an extension "just work" without the
   * `?inline` + `<style>` workaround.
   *
   * A no-op when there is no sibling stylesheet, so existing extensions are
   * unaffected. Renderer-only: guarded on the entry-point name and on the
   * presence of `document`.
   */
  private async injectRendererStyles(extEntryPath: string, extension: InstalledExtension): Promise<void> {
    if (this.dependencies.extensionEntryPointName !== "renderer" || typeof document === "undefined") {
      return;
    }

    const entryDir = this.dependencies.getDirnameOfPath(extEntryPath);
    // Prefer a stylesheet named after the entry (renderer.js -> renderer.css),
    // then Vite's default library CSS asset name (style.css).
    const candidates = [
      extEntryPath.replace(/\.[^./\\]+$/, ".css"),
      this.dependencies.joinPaths(entryDir, "style.css"),
    ];

    for (const cssPath of candidates) {
      if (cssPath === extEntryPath || this.injectedStylePaths.has(cssPath)) {
        continue;
      }

      try {
        if (!(await this.dependencies.pathExists(cssPath))) {
          continue;
        }

        const css = await this.dependencies.readFile(cssPath);

        // Guard again: another async candidate may have won the race meanwhile.
        if (this.injectedStylePaths.has(cssPath)) {
          continue;
        }
        this.injectedStylePaths.add(cssPath);

        const style = document.createElement("style");

        style.dataset.freelensExtension = extension.manifest.name;
        style.textContent = css;
        document.head.appendChild(style);

        this.dependencies.logger.debug(
          `${logModule}: injected stylesheet "${cssPath}" for "${extension.manifest.name}"`,
        );
      } catch (error) {
        this.dependencies.logger.warn(
          `${logModule}: failed to inject stylesheet "${cssPath}" for "${extension.manifest.name}": ${error}`,
        );
      }
    }
  }

  getExtensionById(extId: LensExtensionId) {
    return this.extensions.get(extId);
  }

  getInstanceById(extId: LensExtensionId) {
    return this.dependencies.extensionInstances.get(extId);
  }

  toJSON(): Map<LensExtensionId, InstalledExtension> {
    // toJS is typed T -> T, so its runtime ObservableMap-to-Map conversion is
    // invisible to the checker; the Map copy makes the declared type true.
    return new Map(toJS(this.extensions));
  }
}
