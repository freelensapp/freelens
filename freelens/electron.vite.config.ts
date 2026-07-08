/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Faithful translation of freelens/webpack/{main,renderer,vars}.ts to
// electron-vite — see docs/v2-plan.md, decisions D1/D2/D11.
//
// Differences from the webpack setup that are intentional:
//
// - Workspace @freelensapp/* packages are bundled from TypeScript source
//   (Phase 2, single transpilation shot) instead of being externalized and
//   consumed from dist/. Everything else in dependencies stays external in
//   the main process, like webpack-node-externals did.
// - The renderer keeps nodeIntegration (plan §1); vite-plugin-electron-renderer
//   rewrites `electron` and node builtin imports to runtime require() calls,
//   replacing the webpack `node-commonjs` externals hook. The old externals
//   regex (byline, js-yaml, tar, ...) is dropped: those are plain JS packages
//   and are simply bundled.
// - monaco-editor-webpack-plugin is replaced by MonacoEnvironment.getWorker
//   with module workers (packages/core/src/renderer/monaco/setup-monaco-environment.ts).
// - CopyPlugin for @freelensapp/core fonts is dropped: the fonts are now
//   reached through the source app.scss, so Vite emits them as assets.
// - fork-ts-checker / CircularDependencyPlugin are out of the bundler
//   (plan D1); type-checking is a separate `tsc --noEmit` step.
//
// NOTE: generating sourcemaps for the unminified ~21 MB renderer bundle can
// exceed Node's default heap; run with NODE_OPTIONS=--max-old-space-size=8192
// if the build aborts with an out-of-memory error.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import electronRenderer from "vite-plugin-electron-renderer";

const root = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(root, "static", "build"); // == webpack vars.buildDir

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8")) as {
  dependencies: Record<string, string>;
};

// Workspace packages resolve to .ts sources (Phase 2), so they must be
// bundled rather than externalized.
const workspacePackages = Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@freelensapp/"));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      minify: false, // matches webpack optimization.minimize: false
      sourcemap: true,
      // D2/D3 (Phase 3): ESM main output; `"type": "module"` in package.json
      // makes Electron load the emitted static/build/main.js as ESM.
      lib: { entry: resolve(root, "src/main/index.ts"), formats: ["es"] },
      rollupOptions: {
        output: { entryFileNames: "main.js" },
      },
    },
  },
  renderer: {
    root: resolve(root, "src/renderer"),
    // The renderer is served by the lens proxy under /build/, so all asset
    // URLs must stay relative (webpack used publicPath "/build/").
    base: "./",
    plugins: [react(), electronRenderer()],
    css: {
      // D11: preserve CSS Modules scoped names; code accesses kebab-case
      // keys, so no localsConvention. auto: /\.module\./ is Vite's default.
      modules: { generateScopedName: "[name]__[local]--[hash:base64:5]" },
    },
    worker: {
      // Monaco workers are instantiated as module workers (verified working
      // in the Electron renderer, see #1718).
      format: "es",
    },
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: resolve(root, "src/renderer/index.html"),
      },
    },
  },
});
