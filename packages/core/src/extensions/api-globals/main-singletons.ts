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
// `node-pty` is the one omission here that is a decision rather than a
// non-decision, so it is written down too. Main's v1 entry exported `Pty`, and
// webpack's `libraryTarget: "global"` -- a *global* library target, with no
// library name -- assigned each of the entry's exports straight onto `global`,
// so `global.Pty` was the whole `node-pty` namespace by way of
// `main/library.ts`. Main is still built as a library today
// (`lib: { entry, formats: ["es"] }` in `freelens/electron.vite.config.ts`);
// what #2118 changed is the output *format*, not library versus app. Rollup in
// `es` format emits `export { Mobx, Pty }` and assigns nothing to `globalThis`,
// and nothing imports the emitted entry because Electron runs it as the process
// entry point -- so the exports go nowhere. No v2 build has ever carried
// `global.Pty`; the export removed alongside this change was dead source, not a
// working capability.
//
// It stays out, in this order:
//
//  - Publishing the namespace would hand extensions live `IPty` handles across
//    the extension boundary, into processes whose lifetime and cleanup the host
//    owns (`processes.injectable.ts`, `shell-session.ts`). A pty is therefore a
//    supervised host API -- option 3 of `docs/v2-extension-abi.md` -- rather
//    than an entry in an externals map.
//  - Nothing asks for it: of 69 published Lens/OpenLens/Freelens extension
//    bundler configs, every one of which externalises some subset of `react`,
//    `mobx`, `mobx-react`, `react-dom`, `react/jsx-runtime`, `react-router` and
//    `react-router-dom`, none mentions `node-pty`.
//  - An extension that needs to run a program spawns it with
//    `node:child_process`, which `docs/v2-extension-abi.md` settles as the
//    supported route. Only a program that demands a TTY needs a pty at all.
//  - Under C14 everything published here is frozen until 3.0.0, so adding to
//    this map in a 2.x release is cheap and removing from it is not.
//
// The naming rule would call it `NodePty`, so publishing it would not restore
// the v1 spelling either.
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
