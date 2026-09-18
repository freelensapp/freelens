/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as Mobx from "mobx";
import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import * as Common from "../extensions/common-api";
import * as Renderer from "../extensions/renderer-api";

/**
 * What the host publishes on `globalThis.FreelensExtensionApi` for the renderer
 * process, which is what an extension bundle reads back.
 *
 * `Common` and `Renderer` are already assigned by
 * `freelens/src/renderer/index.ts`; the three singletons are what #2450 adds,
 * and the externals of an extension bundle map onto them (see
 * `packages/fixture-extension/vite.config.mjs`).
 */
export interface RendererExtensionApiGlobals {
  Common: typeof Common;
  Renderer: typeof Renderer;
  React: typeof React;
  ReactJsxRuntime: typeof ReactJsxRuntime;
  Mobx: typeof Mobx;
}

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
 * the ambient declaration of the global (`freelens/src/freelens-extension-api.ts`,
 * `packages/extensions/src/extension-api.ts`) still describes the pre-#2450
 * shape, without the singletons.
 */
export const installExtensionApiGlobals = (): RendererExtensionApiGlobals => {
  const globals: RendererExtensionApiGlobals = {
    Common,
    Renderer,
    React,
    ReactJsxRuntime,
    Mobx,
  };

  Object.assign(globalThis, { FreelensExtensionApi: globals });

  return globals;
};

/** Undoes {@link installExtensionApiGlobals}, so a test can assert the absence too. */
export const uninstallExtensionApiGlobals = () => {
  Object.assign(globalThis, { FreelensExtensionApi: undefined });
};
