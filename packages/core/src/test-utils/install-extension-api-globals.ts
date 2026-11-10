/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { rendererExtensionApiSingletons } from "../extensions/api-globals/renderer-singletons";
import * as Common from "../extensions/common-api";
import * as Renderer from "../extensions/renderer-api";

/**
 * What the host publishes on `globalThis.FreelensExtensionApi` for the renderer
 * process, which is what an extension bundle reads back.
 *
 * The singletons are taken from the very module the application entry point
 * publishes (`api-globals/renderer-singletons.ts`) rather than listed again
 * here: a list would let this helper certify a set the host does not actually
 * publish. The externals of an extension bundle map onto these names -- see
 * `packages/fixture-extension/vite.config.mjs`.
 */
export type RendererExtensionApiGlobals = {
  Common: typeof Common;
  Renderer: typeof Renderer;
} & typeof rendererExtensionApiSingletons;

/**
 * Plays the host's role for unit tests: installs the extension API global from
 * the very modules the test process is already running, so anything an
 * extension bundle pulls off that global is the *same instance* the host uses.
 *
 * This is the executable statement of the contract
 * `freelens/src/renderer/index.ts` fulfils at startup, and `getDiForUnitTesting`
 * is the precedent for its shape: the harness assembles the host's environment
 * rather than mocking it, because instance identity is exactly what mocks
 * cannot check. Two mobx instances do not throw — the host simply stops
 * reacting.
 *
 * Call it before importing an extension bundle: the bundle resolves the global
 * while it evaluates, and throws if nothing is there.
 *
 * Assigned through `Object.assign` rather than a plain property write because
 * the global's ambient declaration is not in scope here: it belongs to the
 * application (`freelens/src/freelens-extension-api.ts`) and to the published
 * package (`packages/extensions/src/extension-api.ts`), neither of which core
 * depends on.
 */
export const installExtensionApiGlobals = (): RendererExtensionApiGlobals => {
  const globals: RendererExtensionApiGlobals = {
    Common,
    Renderer,
    ...rendererExtensionApiSingletons,
  };

  Object.assign(globalThis, { FreelensExtensionApi: globals });

  return globals;
};

/** Undoes {@link installExtensionApiGlobals}, so a test can assert the absence too. */
export const uninstallExtensionApiGlobals = () => {
  Object.assign(globalThis, { FreelensExtensionApi: undefined });
};
