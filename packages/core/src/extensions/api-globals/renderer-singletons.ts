/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// What the renderer publishes on `globalThis.FreelensExtensionApi` besides the
// `Common` and `Renderer` namespaces: the module instances an extension has to
// share with the host instead of bundling its own (#2450).
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
//  - `@ogre-tools/injectable`, `@ogre-tools/injectable-react` -- container and
//    registry identity. An injectable created by a second copy is not one the
//    host's container recognises.
//
// Two modules are outside the map on purpose rather than by omission.
// `@freelensapp/extensions` is not published here because its published runtime
// is the shim that *reads* this global, so an extension bundling it is correct.
// `react-router` and `react-router-dom` are not published here because the host
// dropped them in #2261; the renderer entry's `ReactRouter` and `ReactRouterDom`
// exports went with the dependencies in #2270, so both were v1 globals and both
// left together. An extension still mapping either gets `undefined`, which is
// the honest answer.
//
// The modules are imported here, inside core, so what is published is the
// instance core itself runs on rather than a second resolution of the same
// specifier from the application package.

import * as OgreToolsInjectable from "@ogre-tools/injectable";
import * as OgreToolsInjectableReact from "@ogre-tools/injectable-react";
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
  OgreToolsInjectable,
  OgreToolsInjectableReact,
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
  OgreToolsInjectable: "@ogre-tools/injectable",
  OgreToolsInjectableReact: "@ogre-tools/injectable-react",
};
