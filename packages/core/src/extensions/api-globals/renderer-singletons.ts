/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// What the renderer publishes on `globalThis.FreelensExtensionApi` besides the
// `Common` and `Renderer` namespaces: the module instances an extension has to
// share with the host instead of bundling its own.
//
// Membership is not editorial. A module belongs here when *two instances of it
// misbehave*:
//
//  - `react`, `react-dom`, `react/jsx-runtime` -- hook and reconciler identity.
//    A second React throws "invalid hook call" the first time the host renders
//    a component the extension registered.
//  - `mobx`, `mobx-react` -- observable identity, and this is the one that fails
//    *silently*: two copies of mobx 6 keep interoperating through the state they
//    both write to `globalThis`, so nothing throws and the host simply stops
//    reacting to part of what the extension made observable.
//  - `monaco-editor` -- theme and worker registration are module-global.
//
// Some modules are outside the map on purpose rather than by omission.
// `@freelensapp/extensions` is not published here because its published runtime
// is the shim that *reads* this global, so an extension bundling it is correct.
// `react-router` and `react-router-dom` are not published here because the host
// no longer depends on them; the renderer entry's `ReactRouter` and
// `ReactRouterDom` exports went with the dependencies, so both were v1 globals
// and both left together. An extension still mapping either gets `undefined`,
// which is the honest answer. `@ogre-tools/injectable` and
// `@ogre-tools/injectable-react` are not published here because the host's
// container is not shared with extensions: their identity only matters to code
// holding that container, and publishing them would freeze the host on one
// ogre-tools major for the whole 2.x line. An extension that wants dependency
// injection bundles its own copy, with its own container.
//
// The modules are imported here, inside core, so what is published is the
// instance core itself runs on rather than a second resolution of the same
// specifier from the application package.

import * as Mobx from "mobx";
import * as MobxReact from "mobx-react";
import * as MonacoEditor from "monaco-editor";
import React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import ReactDom from "react-dom";

/**
 * The renderer half of the singleton contract, spread onto the global at
 * startup by `freelens/src/renderer/index.ts`.
 *
 * `React` and `ReactDom` are the default exports rather than the module
 * namespaces, because that is the object an extension's `import React from
 * "react"` resolves to and what v1 published.
 */
export const rendererExtensionApiSingletons = {
  React,
  ReactDom,
  ReactJsxRuntime,
  Mobx,
  MobxReact,
  MonacoEditor,
};

/**
 * The module id each name above is the host's instance of.
 *
 * `Record<keyof …>` keeps the two objects from drifting in membership;
 * `assertExtensionApiSingletonNames` keeps a name from drifting from the rule
 * that derives it.
 */
export const rendererExtensionApiSingletonModuleIds: Record<keyof typeof rendererExtensionApiSingletons, string> = {
  React: "react",
  ReactDom: "react-dom",
  ReactJsxRuntime: "react/jsx-runtime",
  Mobx: "mobx",
  MobxReact: "mobx-react",
  MonacoEditor: "monaco-editor",
};
