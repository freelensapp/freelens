/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Builds the fixture the way a real extension is built: every host-provided
// module is replaced by a module that reads it back off
// `globalThis.FreelensExtensionApi`, so the emitted bundle imports nothing at
// runtime and shares the host's singletons rather than carrying copies of them.
//
// That mapping is the whole reason this package exists. A bundled React means
// two Reacts in the renderer and "invalid hook call" from any hook; a bundled
// mobx means two mobx instances, which do not throw at all — the host simply
// never reacts to what the extension makes observable. Both are runtime-only
// failures, so the bundle has to be built and loaded for either to show up.
//
// The named exports below are listed by hand, and that is deliberate: adding an
// import to the fixture that this file does not account for fails the build with
// "is not exported by", rather than silently bundling a second copy.

import { defineConfig } from "vite";

const HOST_GLOBAL = "globalThis.FreelensExtensionApi";

/**
 * Specifier -> module source reading the same value the host publishes.
 *
 * `@freelensapp/extensions` reproduces what the published runtime shim
 * (`packages/extensions/src/runtime-shim.ts`) does; the rest are the singletons
 * the host re-exports alongside it.
 *
 * @type {Record<string, string>}
 */
const hostProvidedModules = {
  "@freelensapp/extensions": `const api = ${HOST_GLOBAL};
export const Common = api.Common;
export const Main = api.Main;
export const Renderer = api.Renderer;
`,

  react: `const React = ${HOST_GLOBAL}.React;
export default React;
export const { Component, useCallback, useMemo, useState } = React;
`,

  "react/jsx-runtime": `const jsxRuntime = ${HOST_GLOBAL}.ReactJsxRuntime;
export const { Fragment, jsx, jsxs } = jsxRuntime;
`,

  mobx: `const mobx = ${HOST_GLOBAL}.Mobx;
export const { computed, observable, runInAction } = mobx;
`,
};

const virtualPrefix = "\0freelens-host:";

/** @type {import("vite").Plugin} */
const hostProvidedModulesPlugin = {
  name: "freelens-host-provided-modules",
  // Ahead of Vite's own resolver, which would otherwise resolve
  // `@freelensapp/extensions` through the workspace link and bundle the whole
  // of core, and `react`/`mobx` to the copies in node_modules.
  enforce: "pre",

  resolveId(source) {
    return Object.hasOwn(hostProvidedModules, source) ? `${virtualPrefix}${source}` : null;
  },

  load(id) {
    return id.startsWith(virtualPrefix) ? hostProvidedModules[id.slice(virtualPrefix.length)] : null;
  },
};

/**
 * One entry point per run: the renderer by default, the main entry with
 * `--mode main`. The renderer is built for a browser page and the main entry
 * for Node, so they cannot share settings, and each bundle carries its own
 * copy of `src/common/` rather than a shared chunk the other process would
 * have to load.
 */
const entryPoints = {
  renderer: {
    entry: "src/renderer/index.tsx",
    // First of the two runs in `build`, so it clears the output directory.
    emptyOutDir: true,
    external: [],
  },
  main: {
    entry: "src/main/index.ts",
    emptyOutDir: false,
    // Node resolves its own builtins at runtime. Only main may import them:
    // `src/renderer/tsconfig.json` has no Node types, so an import of one
    // there fails the type check before it could reach a bundle.
    external: [/^node:/],
  },
};

export default defineConfig(({ mode }) => {
  const name = mode === "main" ? "main" : "renderer";
  const entryPoint = entryPoints[name];

  return {
    plugins: [hostProvidedModulesPlugin],
    build: {
      target: "esnext",
      // Readable output: this bundle is read by humans reviewing what the
      // contract compiled down to, and loaded by the unit tests as-is.
      minify: false,
      sourcemap: false,
      emptyOutDir: entryPoint.emptyOutDir,
      lib: {
        entry: entryPoint.entry,
        formats: ["es"],
        fileName: () => `${name}.js`,
      },
      rollupOptions: {
        external: entryPoint.external,
      },
    },
  };
});
