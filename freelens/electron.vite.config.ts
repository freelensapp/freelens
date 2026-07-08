/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Phase 1 scaffold (WIP) — see docs/v2-plan.md, decisions D1/D2/D11.
// This is a faithful translation of freelens/webpack/{main,renderer,vars}.ts to
// electron-vite. It is intentionally incomplete: TODOs below mark the gaps that
// still need local iteration against a real Electron run (the "packaged app that
// boots" bar from Phase 1 cannot be verified on a headless CI runner).
//
// Phase 3 (WIP) — ESM flip (D2/D3): the main process output is switched from CJS
// to ESM here. The matching `"type": "module"` flip across freelens and the
// workspace packages is codemodded by scripts/v2-phase-3-esm-flip.mjs; the
// extension loader's require()->import() move and Monaco module workers are
// tracked as TODOs below (behaviour-bearing, not headless-verifiable).

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const root = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(root, "static", "build"); // == webpack vars.buildDir

export default defineConfig({
  main: {
    // D1: workspace @freelensapp/* stay externalized in Phase 1 (still consumed
    // from dist); they become bundled-from-source in Phase 2. In Phase 1 this
    // mirrors webpack-node-externals({ modulesFromFile: true }).
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: buildDir,
      minify: false, // matches optimization.minimize: false
      sourcemap: true,
      // D2/D3 (Phase 3): ESM main output. Requires `"type": "module"` in
      // freelens/package.json (see scripts/v2-phase-3-esm-flip.mjs) so the
      // emitted `main.js` is loaded as ESM; otherwise electron-vite writes an
      // `.mjs` and the package `main` field must point at it. Verify locally.
      lib: { entry: resolve(root, "src/main/index.ts"), formats: ["es"] },
    },
  },
  renderer: {
    root: resolve(root, "src/renderer"),
    plugins: [react()], // React 17
    css: {
      // D11: preserve CSS Modules scoped name; no localsConvention change
      // (code accesses kebab-case keys). auto: /\.module\./ is Vite's default.
      modules: { generateScopedName: "[name]__[local]--[hash:base64:5]" },
    },
    build: {
      outDir: buildDir,
      minify: false,
      sourcemap: true,
      rollupOptions: { input: resolve(root, "src/renderer/index.html") },
    },
    // TODO(D11): Monaco json+yaml workers via MonacoEnvironment.getWorker (module workers).
    //            Replaces monaco-editor-webpack-plugin({ languages: ["json", "yaml"] }).
    // TODO(D1): carry over the renderer node-externals list (webpack renderer.ts
    //           had a typo `js-yam`; the intended package is `js-yaml`):
    //           /^(byline|isomorphic-ws|js-yaml|node:|npm|openid-client|pnpm|request|rfc4648|stream-buffers|tar|tslib)/
    // TODO: svg -> source (webpack asset/source); .svg default export must be raw XML.
    // TODO: copy @freelensapp/core fonts (CopyPlugin equivalent) into buildDir/fonts.
  },
});
