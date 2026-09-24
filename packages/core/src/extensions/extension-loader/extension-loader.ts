/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { pathToFileURL } from "node:url";
import { EventEmitter } from "@freelensapp/event-emitter";
import { isDefined, iter } from "@freelensapp/utilities";
import { ipcMain, ipcRenderer } from "electron";
import { isEqual } from "es-toolkit";
import { action, computed, observable, reaction, runInAction, toJS, when } from "mobx";
import { broadcastMessage, ipcMainHandle, ipcMainOn, ipcRendererOn } from "../../common/ipc";
import {
  extensionLoaderFromMainChannel,
  extensionLoaderFromRendererChannel,
  extensionLoaderReloadDevelopmentChannel,
} from "../../common/ipc/extension-handling";
import { developmentBuildSegment } from "../../features/extensions/loader/common/build-segment";
import { extensionFileUrl, toFileSegments } from "../../features/extensions/loader/common/scheme";
import { requestExtensionLoaderInitialState } from "../../renderer/ipc";
import { sanitizeExtensionName } from "../lens-extension";

import type { Fetch } from "@freelensapp/json-api";
import type { Logger } from "@freelensapp/logger";
import type { GetRandomId } from "@freelensapp/random";

import type { ObservableMap } from "mobx";

import type { GetBasenameOfPath } from "../../common/path/get-basename.injectable";
import type { JoinPaths } from "../../common/path/join-paths.injectable";
import type { UpdateExtensionsState } from "../../features/extensions/enabled/common/update-state.injectable";
import type {
  InstalledExtension,
  LensExtensionConstructor,
  LensExtensionId,
  LensExtensionInstance,
  LensExtensionManifest,
} from "../installed-extension";
import type { LensExtension } from "../lens-extension";
import type { Extension } from "./extension/extension.injectable";

const logModule = "[EXTENSIONS-LOADER]";

/**
 * How Node will load an entry point: as an ES module, or through `require`.
 */
type ModuleFormat = "module" | "commonjs";

/**
 * The format an entry point will be loaded as.
 *
 * The file extension decides it outright when there is one — `.mjs` is ESM and
 * `.cjs` is CommonJS whatever else says — and a `.js` entry point is decided by
 * the extension's own manifest, which is the `package.json` nearest to it in
 * the normal case and is already in hand here. A manifest edited since the
 * extension was discovered is not accounted for, for the same reason the rest
 * of the manifest is not: nothing watches it.
 */
const moduleFormatOf = (manifest: LensExtensionManifest, entryPointPath: string): ModuleFormat => {
  if (entryPointPath.endsWith(".mjs")) {
    return "module";
  }

  if (entryPointPath.endsWith(".cjs")) {
    return "commonjs";
  }

  return manifest.type === "module" ? "module" : "commonjs";
};

interface Dependencies {
  readonly extensionInstances: ObservableMap<LensExtensionId, LensExtensionInstance>;
  readonly logger: Logger;
  readonly extensionEntryPointName: "main" | "renderer";
  updateExtensionsState: UpdateExtensionsState;
  getExtension: (instance: LensExtensionInstance) => Extension;
  getRandomId: GetRandomId;
  joinPaths: JoinPaths;
  getBasenameOfPath: GetBasenameOfPath;
  fetch: Fetch;
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

  // URLs of extension stylesheets already linked into the renderer document, so
  // a reload (the toJSON reaction re-loads user extensions) does not append the
  // same <link> twice. Keying on the URL rather than the file means a new build
  // -- which carries a new path segment -- is linked again. A URL is forgotten
  // when its element is taken out again: see `removeInjectedStyles`.
  private readonly injectedStyleUrls = new Set<string>();

  // One URL token per load of a development extension, held for as long as that
  // load lasts. See `developmentBuildSegment`: minting one per request would
  // give a relative import inside the extension a different URL from the entry
  // that imported it, and instantiate the same module twice. A reload replaces
  // the token, which is the whole of how the new build is reached.
  private readonly developmentLoadTokens = new Map<LensExtensionId, string>();

  // The format each development extension's `main` entry point was actually
  // loaded as, recorded when this process built the URL it imported. What the
  // process holds is what matters, not what is on disk now: a rebuild may
  // already have replaced a CommonJS entry point with an ESM one, and Node
  // would still answer with the CommonJS module it resolved and cached.
  private readonly developmentModuleFormats = new Map<LensExtensionId, ModuleFormat>();

  // The reload of each development extension which is still running, so that a
  // second rebuild waits for the first reload rather than racing it. Without
  // this the later token could be minted while the earlier load is still in
  // flight, and the extension would end up running the older build under the
  // newer token -- stale code with nothing left to say so.
  private readonly developmentReloads = new Map<LensExtensionId, Promise<void>>();

  // Extensions whose entry point is being imported right now. `import()` is
  // asynchronous, so the check against `extensionInstances` no longer runs in
  // the same tick as the write to it, and a second reaction firing meanwhile
  // would otherwise load the same extension twice.
  private readonly extensionsBeingLoaded = new Set<LensExtensionId>();

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

    // Whatever takes an extension out -- a disable, an uninstall, the teardown
    // half of a reload -- also takes its stylesheets out, or the rules of an
    // extension which is no longer running go on applying. Before the instance
    // check, because an extension whose entry point loaded but exported no
    // class for this process has stylesheets and no instance. The name comes
    // from the manifest, which is still there at this point and is what the
    // links are tagged with.
    const extensionName = this.extensions.get(lensExtensionId)?.manifest.name ?? instance?.name;

    if (extensionName) {
      this.removeInjectedStyles(extensionName);
    }

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
    ipcRendererOn(extensionLoaderReloadDevelopmentChannel, (event, extensionId: LensExtensionId, token: string) => {
      void this.reloadDevelopmentExtension(extensionId, token);
    });
  }

  /**
   * Load a development extension again after its author rebuilt it.
   *
   * Main is where a rebuild is noticed, and it mints the token: one reload is
   * one token in both processes. A reload is a full teardown and not a swap --
   * `onDeactivate`, the extension's disposers, its registrations, its instance
   * -- because a running module graph cannot be replaced underneath itself.
   *
   * A rebuild which cannot be reloaded is refused before any of that and before
   * the broadcast, so that neither process tears anything down: see
   * `reasonNotToReload`.
   *
   * Only then is the new token installed and the entry point imported again,
   * which reaches the new build because the token is part of the URL the module
   * map is keyed by. The previous graph stays in that map: a module object
   * cannot be evicted from a realm, so memory grows with the reload count. That
   * is documented in the migration guide rather than fixed, since
   * deinitialisation itself happens properly through the lifecycle hook.
   */
  async reloadDevelopmentExtension(extensionId: LensExtensionId, token?: string): Promise<void> {
    const refusal = this.reasonNotToReload(extensionId);

    if (refusal) {
      // Before the broadcast, so the processes stay on the same build: a
      // renderer which reloaded while main could not would leave the author
      // debugging a main process running code that is no longer on disk.
      return void this.dependencies.logger.warn(`${logModule}: ${refusal} Restart the application to run it.`);
    }

    const reloadToken = token ?? this.dependencies.getRandomId();

    if (!token) {
      // Minted here, so every renderer reloads the same build under the same
      // token. A renderer which is not listening yet has nothing loaded to
      // reload, and will load the new build when it asks for the state.
      void broadcastMessage(extensionLoaderReloadDevelopmentChannel, extensionId, reloadToken);
    }

    const reload = (this.developmentReloads.get(extensionId) ?? Promise.resolve())
      .then(() => this.applyDevelopmentReload(extensionId, reloadToken))
      .catch((error: unknown) => {
        this.dependencies.logger.error(`${logModule}: failed to reload extension`, { extensionId, error });
      });

    this.developmentReloads.set(extensionId, reload);

    await reload;

    if (this.developmentReloads.get(extensionId) === reload) {
      this.developmentReloads.delete(extensionId);
    }
  }

  /**
   * Why this rebuild cannot be reloaded, as a sentence, or `undefined` when it
   * can be.
   *
   * Only the `main` entry point can refuse, and only one of two ways, both of
   * which come out of Node's caches rather than out of anything the host does:
   *
   * - **It was loaded as CommonJS.** `require` keys its cache by filename, and
   *   the per-load token this class puts on the `file:` URL does not reach it,
   *   so importing the entry point again returns the module already running.
   *   The file on disk being ESM now does not help: Node also caches the format
   *   it resolved for that path, so the path stays CommonJS for the life of the
   *   process. Nothing can evict either cache, which is why this is refused
   *   rather than worked around.
   * - **It was loaded as ESM and the new build is CommonJS.** The token does
   *   make a new module of it, and evaluating CommonJS as ESM throws
   *   `ReferenceError: module is not defined in ES module scope` — an error
   *   which names neither this extension nor the real cause, and sends an
   *   author looking for `module` in their own source.
   *
   * A managed install cannot reach either: an update lands under a different
   * `<version>-<digest8>` directory, so it is a different filename and no cache
   * collides.
   */
  private reasonNotToReload(extensionId: LensExtensionId): string | undefined {
    if (this.dependencies.extensionEntryPointName !== "main") {
      return undefined;
    }

    const extension = this.extensions.get(extensionId);
    const entryPointPath = extension?.manifest.main;

    if (!extension || !entryPointPath) {
      return undefined;
    }

    const loadedAs = this.developmentModuleFormats.get(extensionId);

    if (!loadedAs) {
      // Nothing of this extension is loaded in this process, so what follows is
      // a first load rather than a reload, and a first load of either format is
      // supported.
      return undefined;
    }

    const name = extension.manifest.name;

    if (loadedAs === "commonjs") {
      return (
        `not reloading "${name}" after a rebuild: its "${entryPointPath}" entry point was loaded as CommonJS, ` +
        `which Node caches by filename for the life of the process, so the running build would stay.`
      );
    }

    if (moduleFormatOf(extension.manifest, entryPointPath) === "commonjs") {
      return (
        `not reloading "${name}" after a rebuild: its "${entryPointPath}" entry point was loaded as ESM and the ` +
        `new build is CommonJS, which cannot be evaluated as a module.`
      );
    }

    return undefined;
  }

  private async applyDevelopmentReload(extensionId: LensExtensionId, token: string): Promise<void> {
    const extension = this.extensions.get(extensionId);

    if (!extension) {
      return void this.dependencies.logger.warn(`${logModule}: cannot reload an extension which is not installed`, {
        extensionId,
      });
    }

    if (extension.isManaged) {
      // A managed build's content cannot change without a new install, which is
      // a different path and a different URL, so there is nothing to reload.
      return void this.dependencies.logger.warn(`${logModule}: refusing to reload the managed extension`, {
        extensionId,
      });
    }

    this.dependencies.logger.info(`${logModule}: reloading ${extension.manifest.name} after a rebuild`);

    await this.disposeInstance(extensionId);

    // The previous load may have concluded that this process has no class to
    // instantiate; the rebuild is free to have changed that.
    this.nonInstancesByName.delete(extension.manifest.name);

    // Usually already done by `removeInstance`, but a reload has to remove them
    // even when there was no instance to remove: an entry point which loaded
    // and exported no class for this process still linked its stylesheets.
    this.removeInjectedStyles(extension.manifest.name);

    this.developmentLoadTokens.set(extensionId, token);

    const reloaded = await this.loadUserExtensions(new Map([[extensionId, extension]]));

    await this.loadExtensions(reloaded);
  }

  /**
   * Tear an instance down and wait for it.
   *
   * `disable()` is what awaits `onDeactivate` and runs the extension's
   * disposers, and it is the order the teardown has to happen in, so a reload
   * reuses it rather than writing a second one. `removeInstance` then does the
   * rest -- deregistering what the extension registered and dropping the
   * instance -- and calls `disable()` again, which returns immediately the
   * second time.
   */
  private async disposeInstance(extensionId: LensExtensionId): Promise<void> {
    const instance = this.dependencies.extensionInstances.get(extensionId);

    if (!instance) {
      return;
    }

    try {
      await instance.disable();
    } catch (error) {
      this.dependencies.logger.error(`${logModule}: deactivating extension error`, { extensionId, error });
    }

    this.removeInstance(extensionId);
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
    // 1. import and call .activate for each Extension
    // 2. Wait until every extension's onActivate has been resolved
    // 3. Call .enable for each extension
    // 4. Return ExtensionLoading[]

    const loading = [...installedExtensions.entries()].map(async ([extId, installedExtension]) => {
      const alreadyInit =
        this.dependencies.extensionInstances.has(extId) ||
        this.nonInstancesByName.has(installedExtension.manifest.name) ||
        this.extensionsBeingLoaded.has(extId);

      if (installedExtension.isCompatible && installedExtension.isEnabled && !alreadyInit) {
        this.extensionsBeingLoaded.add(extId);

        try {
          const LensExtensionClass = await this.requireExtension(installedExtension);

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
        } finally {
          this.extensionsBeingLoaded.delete(extId);
        }
      } else if (!installedExtension.isEnabled && alreadyInit) {
        this.removeInstance(extId);
      }

      return null;
    });

    return (await Promise.all(loading)).filter(isDefined);
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

  /**
   * Load an extension's entry point for this process.
   *
   * The two processes reach the same extension by different routes. Main
   * imports a real file path, which the installer's full extraction guarantees
   * exists. The renderer imports a URL on the privileged scheme main serves,
   * which is what lets a renderer without filesystem privileges keep working
   * (#2399) and what makes top-level await in a renderer entry point legal.
   */
  protected async requireExtension(extension: InstalledExtension): Promise<LensExtensionConstructor | null> {
    const entryPointPath = extension.manifest[this.dependencies.extensionEntryPointName];

    if (!entryPointPath) {
      return null;
    }

    const entryPointUrl =
      this.dependencies.extensionEntryPointName === "renderer"
        ? this.servedUrlOf(extension, toFileSegments(entryPointPath))
        : this.fileUrlOf(extension, entryPointPath);

    try {
      // The specifier is only known at runtime, so the bundler must leave it
      // alone rather than trying to resolve it at build time.
      const extensionModule = await import(/* @vite-ignore */ entryPointUrl);

      // Load the extension's renderer stylesheet, if any. Extensions are built
      // in Vite library mode, which extracts CSS to a sibling asset and injects
      // nothing (unlike the host's own application build). Without this, an
      // extension has to import its SCSS twice and inline it through a manual
      // `<style>` tag (see docs/v2-extension-migration.md). Fire-and-forget: the
      // entry point is loaded, style injection is a side effect.
      void this.injectRendererStyles(extension, toFileSegments(entryPointPath));

      const exported = extensionModule.default;

      // `import()` of a CommonJS entry point resolves `default` to the whole
      // `module.exports`, so a transpiled `export default class` arrives one
      // level deeper than it does from an ESM entry point. Only main can reach
      // this: a renderer entry point is ESM by contract, and CommonJS served
      // over the scheme would not parse as a module at all.
      return (exported?.__esModule ? exported.default : exported) ?? null;
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
   * The URL main serves one of an extension's files from.
   *
   * The segment standing for the build is `<version>-<digest8>` for a managed
   * install, which changes exactly when the content does. A development install
   * has no such segment -- its absence is what marks it -- so it gets a token
   * for the duration of the load instead.
   */
  private servedUrlOf(extension: InstalledExtension, fileSegments: string[]): string {
    return extensionFileUrl({
      sanitizedName: sanitizeExtensionName(extension.id),
      buildSegment: extension.isManaged
        ? this.dependencies.getBasenameOfPath(extension.absolutePath)
        : developmentBuildSegment(this.developmentLoadTokenOf(extension.id)),
      fileSegments,
    });
  }

  /**
   * The `file:` URL main imports an extension's entry point from.
   *
   * Main does not go through the scheme -- the installer's full extraction
   * guarantees a real path -- but it has the renderer's module-map problem all
   * the same: Node keys the map by URL, and a bare path is the same key after a
   * rebuild as before it. A development install therefore carries the same
   * per-load token as a query, which makes a distinct key out of the same file.
   *
   * ESM only: a CommonJS entry point is cached by filename below the ESM loader,
   * so the query does not reach the cache that holds it. The format this load
   * has is therefore remembered here, which is the one place a main-process load
   * of a development extension passes through, and `reasonNotToReload` refuses
   * the next reload on it.
   */
  private fileUrlOf(extension: InstalledExtension, entryPointPath: string): string {
    const url = pathToFileURL(this.dependencies.joinPaths(extension.absolutePath, entryPointPath));

    if (!extension.isManaged) {
      url.searchParams.set("v", this.developmentLoadTokenOf(extension.id));
      this.developmentModuleFormats.set(extension.id, moduleFormatOf(extension.manifest, entryPointPath));
    }

    return url.href;
  }

  private developmentLoadTokenOf(extensionId: LensExtensionId): string {
    let token = this.developmentLoadTokens.get(extensionId);

    if (!token) {
      token = this.dependencies.getRandomId();
      this.developmentLoadTokens.set(extensionId, token);
    }

    return token;
  }

  /**
   * Link an extension's renderer stylesheet into the host document.
   *
   * Vite library builds emit the extension's CSS as an asset next to the
   * renderer entry (either `<entry>.css` or a `style.css` in the same folder)
   * but, unlike an application build, do not inject it, so nothing would ever
   * load it. The host keeps that responsibility rather than asking extension
   * authors for the `?inline` + `<style>` workaround: this appends a `<link>`
   * at the URL main serves the stylesheet from, which is the same route the
   * entry point itself takes.
   *
   * A no-op when there is no sibling stylesheet, so existing extensions are
   * unaffected. Renderer-only: guarded on the entry-point name and on the
   * presence of `document`.
   */
  private async injectRendererStyles(extension: InstalledExtension, entryPointSegments: string[]): Promise<void> {
    if (this.dependencies.extensionEntryPointName !== "renderer" || typeof document === "undefined") {
      return;
    }

    const directorySegments = entryPointSegments.slice(0, -1);
    const entryFileName = entryPointSegments.at(-1);

    if (!entryFileName) {
      return;
    }

    // Prefer a stylesheet named after the entry (renderer.js -> renderer.css),
    // then Vite's default library CSS asset name (style.css).
    const candidates = new Set([entryFileName.replace(/\.[^.]+$/, ".css"), "style.css"]);

    candidates.delete(entryFileName);

    for (const fileName of candidates) {
      const fileSegments = [...directorySegments, fileName];
      const url = this.servedUrlOf(extension, fileSegments);

      if (this.injectedStyleUrls.has(url)) {
        continue;
      }

      try {
        // A `<link>` at a URL which is not there logs a failed request and
        // nothing else, but the extensions which do not ship CSS are the
        // majority, so the existence check stays. It asks the scheme rather
        // than the filesystem, because a renderer which reads an absolute path
        // off disk here is a renderer that still needs filesystem privileges
        // (#2399) -- the very thing serving extensions over a URL is for. Main
        // answers a file it does not have with 404, out of the same registry it
        // consulted for the entry point, and the status is the whole answer:
        // nothing here reads the body. A plain GET rather than a HEAD because
        // the handler reads the file whatever the method is, so a HEAD would
        // save only this hop's copy of a stylesheet the `<link>` is about to
        // ask for anyway -- and GET is the request the scheme is known to
        // answer, being the one the entry-point import itself makes.
        const response = await this.dependencies.fetch(url);

        if (!response.ok) {
          continue;
        }

        // Guard again: another async candidate may have won the race meanwhile.
        if (this.injectedStyleUrls.has(url)) {
          continue;
        }
        this.injectedStyleUrls.add(url);

        const link = document.createElement("link");

        link.rel = "stylesheet";
        link.href = url;
        link.dataset.freelensExtension = extension.manifest.name;
        document.head.appendChild(link);

        this.dependencies.logger.debug(`${logModule}: linked stylesheet "${url}" for "${extension.manifest.name}"`);
      } catch (error) {
        this.dependencies.logger.warn(
          `${logModule}: failed to link stylesheet "${url}" for "${extension.manifest.name}": ${error}`,
        );
      }
    }
  }

  /**
   * Take an extension's stylesheets back out of the document.
   *
   * A reload links the new build's stylesheet at a new URL, and without this
   * the previous one stays in the document applying its rules: the handler
   * accepts any development token, so the stale URL still resolves, and two
   * reloads would leave three stylesheets fighting. The `data-` attribute the
   * link carries is what identifies whose it is -- read by comparing the value
   * rather than by an attribute selector, so a manifest name needs no CSS
   * escaping.
   *
   * Their URLs are forgotten at the same time. `injectedStyleUrls` exists to
   * keep one load from linking the same file twice, so an entry left behind
   * after the element is gone would mean an extension could never link a URL it
   * had once used again.
   */
  private removeInjectedStyles(extensionName: string): void {
    if (typeof document === "undefined") {
      return;
    }

    const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>("link[data-freelens-extension]"));

    for (const link of links) {
      if (link.dataset.freelensExtension !== extensionName) {
        continue;
      }

      const url = link.getAttribute("href");

      if (url) {
        this.injectedStyleUrls.delete(url);
      }

      link.remove();

      this.dependencies.logger.debug(`${logModule}: unlinked stylesheet "${url}" of "${extensionName}"`);
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
