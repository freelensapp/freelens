/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The naming rule of the host-provided singletons, and the two maps the
// application entry points publish, checked against it.
//
// The entry points assert the same thing at startup, which is where it protects
// an extension; this file is where it fails in CI without anyone having to
// launch the application. Both are worth having: the assertion is what holds the
// contract at runtime, and a name that does not match it hands every extension
// `undefined` rather than an error.

import { assertExtensionApiSingletonNames, globalNameForModuleId } from "../api-globals/global-name-for-module-id";
import { mainExtensionApiSingletonModuleIds, mainExtensionApiSingletons } from "../api-globals/main-singletons";
import {
  rendererExtensionApiSingletonModuleIds,
  rendererExtensionApiSingletons,
} from "../api-globals/renderer-singletons";

describe("extension API singletons", () => {
  describe("the naming rule", () => {
    it.each([
      ["react", "React"],
      ["react-dom", "ReactDom"],
      ["react/jsx-runtime", "ReactJsxRuntime"],
      ["mobx", "Mobx"],
      ["mobx-react", "MobxReact"],
      ["monaco-editor", "MonacoEditor"],
      ["@scope/some-name", "ScopeSomeName"],
    ])("publishes %s as %s", (moduleId, expected) => {
      expect(globalNameForModuleId(moduleId)).toBe(expected);
    });
  });

  describe("what the renderer publishes", () => {
    it("names every singleton by the rule", () => {
      expect(() =>
        assertExtensionApiSingletonNames(rendererExtensionApiSingletons, rendererExtensionApiSingletonModuleIds),
      ).not.toThrow();
    });

    it("is the closed list of the contract", () => {
      // Written out rather than derived, so adding one is an edit made on
      // purpose: the list is the contract, and membership has a criterion (two
      // instances of it misbehave) that a test cannot apply for us.
      expect(Object.keys(rendererExtensionApiSingletonModuleIds).sort()).toEqual([
        "Mobx",
        "MobxReact",
        "MonacoEditor",
        "React",
        "ReactDom",
        "ReactJsxRuntime",
      ]);
    });

    it("does not publish ogre-tools", () => {
      // The host's container is not shared with extensions, so the DI library
      // stays an implementation detail of the host.
      expect(rendererExtensionApiSingletons).not.toHaveProperty("OgreToolsInjectable");
      expect(rendererExtensionApiSingletons).not.toHaveProperty("OgreToolsInjectableReact");
    });
  });

  describe("what the main process publishes", () => {
    it("names every singleton by the rule", () => {
      expect(() =>
        assertExtensionApiSingletonNames(mainExtensionApiSingletons, mainExtensionApiSingletonModuleIds),
      ).not.toThrow();
    });

    it("is the subset main actually has", () => {
      // Not the renderer's whole list: `react`, `react-dom`, `react/jsx-runtime`,
      // `mobx-react` and `monaco-editor` would pull a DOM renderer and a code
      // editor into a bundle with no window, for an entry point that cannot use
      // them.
      expect(Object.keys(mainExtensionApiSingletonModuleIds).sort()).toEqual(["Mobx"]);
    });

    it("does not publish ogre-tools", () => {
      expect(mainExtensionApiSingletons).not.toHaveProperty("OgreToolsInjectable");
      expect(mainExtensionApiSingletons).not.toHaveProperty("OgreToolsInjectableReact");
    });
  });

  describe("the assertion the entry points run", () => {
    it("rejects a name that is not the one the rule derives", () => {
      // The v1 spelling, which is exactly the mistake this catches.
      expect(() => assertExtensionApiSingletonNames({ ReactDOM: {} }, { ReactDOM: "react-dom" })).toThrow(
        'must be published as "ReactDom", not "ReactDOM"',
      );
    });

    it("rejects a singleton that resolved to nothing", () => {
      expect(() => assertExtensionApiSingletonNames({ Mobx: undefined }, { Mobx: "mobx" })).toThrow(
        'singleton "Mobx" ("mobx") resolved to undefined',
      );
    });
  });
});
