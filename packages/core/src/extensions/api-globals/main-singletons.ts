/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// What the main process publishes on `globalThis.FreelensExtensionApi` besides
// the `Common` and `Main` namespaces (#2450).
//
// Each process publishes the set it actually has, not the whole contract:
// `react`, `react-dom`, `react/jsx-runtime`, `mobx-react` and `monaco-editor`
// would pull a DOM renderer and a code editor into a main-process bundle that
// has no window to render into, and an extension's main entry point has nothing
// to do with any of them. What is left is what a main-process extension can
// really use:
//
//  - `mobx` -- observable identity, and the failure that does not throw. The
//    main process is where an extension's stores and its catalog entities live,
//    so this is the one that matters most here.
//  - `@ogre-tools/injectable` -- container and registry identity, so an
//    injectable an extension creates is one the host's container recognises.
//
// `@ogre-tools/injectable-react` is deliberately not here even though it is
// part of the eight: it is a React binding, so publishing it in main would drag
// React into the main bundle to serve an extension that has no renderer to bind
// to. The renderer publishes it.
//
// The modules are imported here, inside core, so what is published is the
// instance core itself runs on rather than a second resolution of the same
// specifier from the application package.

import * as OgreToolsInjectable from "@ogre-tools/injectable";
import * as Mobx from "mobx";

/**
 * The main half of the singleton contract, spread onto the global at startup by
 * `freelens/src/main/index.ts`.
 */
export const mainExtensionApiSingletons = {
  Mobx,
  OgreToolsInjectable,
};

/**
 * The module id each name above is the host's instance of.
 *
 * `Record<keyof …>` keeps the two objects from drifting in membership;
 * `assertExtensionApiSingletonNames` keeps a name from drifting from the rule
 * that derives it.
 */
export const mainExtensionApiSingletonModuleIds: Record<keyof typeof mainExtensionApiSingletons, string> = {
  Mobx: "mobx",
  OgreToolsInjectable: "@ogre-tools/injectable",
};
