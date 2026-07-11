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

// Dev-server port for `electron-vite dev`. The lens proxy's dev static-file
// route (packages/core/src/main/routes/files/development.injectable.ts)
// proxies renderer requests here, exactly as it did to the webpack dev server
// before; both sides read the same environment variable.
const devServerPort = Number(process.env.FREELENS_DEV_SERVER_PORT) || 9191;

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8")) as {
  dependencies: Record<string, string>;
};

// Workspace packages resolve to .ts sources (Phase 2), so they must be
// bundled rather than externalized.
const workspacePackages = Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@freelensapp/"));

// CommonJS dependencies that must be bundled into the ESM main process
// because Node cannot consume them as externals at runtime:
// - crypto-js, lodash: imported through extensionless subpaths (e.g.
//   `crypto-js/enc-base64`, `lodash/fp`) and neither ships an `exports`
//   map, so once the main bundle is real ESM (D2/D3, formats: ["es"]) Node's
//   ESM resolver refuses the specifiers at runtime with ERR_MODULE_NOT_FOUND
//   / ERR_UNSUPPORTED_DIR_IMPORT (it does not append `.js` or resolve a
//   directory index the way CommonJS require did).
// - @ogre-tools/*: webpack-bundled CJS whose exports are defined via
//   Object.defineProperty getters; cjs-module-lexer cannot detect them, so
//   named imports fail at ESM link time ("Named export ... not found").
// - await-lock: a CJS module that exports its class as `exports.default`.
//   Under a bundler TypeScript's esModuleInterop binds `import AwaitLock from
//   "await-lock"` to `module.exports.default` (the class), but Node's native
//   ESM interop binds the default import to the whole `module.exports` object
//   (`{ __esModule: true, default: [class] }`), so `new AwaitLock()` throws
//   "AwaitLock is not a constructor".
// Bundling lets Vite resolve the subpaths, named exports and default interop
// at build time, sidestepping runtime ESM resolution.
const bundledCjsPackages = [
  "crypto-js",
  "lodash",
  "await-lock",
  "@ogre-tools/injectable",
  "@ogre-tools/fp",
  "@ogre-tools/injectable-extension-for-mobx",
];

// Rewrite the packaged main bundle's single merged `electron` import from a
// named import into a default import + destructure.
//
// `electron` stays external, and the ESM main bundle (D2/D3, formats: ["es"])
// emits `import { app, ipcRenderer, ... } from "electron"`. In the main
// process Electron's ESM `electron` module only exposes the *main-process*
// named exports; renderer-only names (e.g. `ipcRenderer`) are absent, so a
// static named import throws at link time:
//   SyntaxError: The requested module 'electron' does not provide an export
//   named 'ipcRenderer'.
// Shared code imports those names to branch on the current process
// (`const channel = ipcRenderer ? ... : ...`), relying on them being
// `undefined` in main — exactly how the old CommonJS build behaved. Turning
// the import into `import electron from "electron"; const { ipcRenderer } =
// electron;` restores that: missing names resolve to `undefined` at runtime
// instead of failing at link time.
function rewriteElectronNamedImportsPlugin() {
  const electronImportRe = /import\s*\{([^}]*)\}\s*from\s*(["'])electron\2;?/g;

  return {
    name: "freelens:rewrite-electron-named-imports",
    renderChunk(code: string) {
      let changed = false;

      const out = code.replace(electronImportRe, (match: string, specifiers: string) => {
        changed = true;

        const bindings = specifiers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            // `foo as bar` in an import becomes `foo: bar` in a destructure.
            const alias = /^(.+?)\s+as\s+(.+)$/.exec(s);
            return alias ? `${alias[1]}: ${alias[2]}` : s;
          })
          .join(", ");

        // Keep the original line count so the chunk sourcemap stays aligned.
        const newlines = "\n".repeat((match.match(/\n/g) ?? []).length);

        return `import electron from "electron"; const { ${bindings} } = electron;${newlines}`;
      });

      return changed ? { code: out, map: null } : null;
    },
  };
}

// Set the renderer's public base path for the packaged build.
//
// The packaged app loads the renderer from the lens proxy web root
// (https://renderer.freelens.app:<port>/), while the built assets live under
// static/build/. So the production HTML must reference assets with an absolute
// "/build/" prefix — exactly what webpack's publicPath "/build/" produced. The
// prod file route (packages/core/src/main/routes/files/production.injectable.ts)
// serves /build/... from static/build/..., whereas a relative "./" base would
// resolve to /assets/... at the web root and 404 as static/assets/....
//
// electron-vite's renderer preset force-sets base to "./" for the production
// build (it assumes file:// loading), so this plugin must run with
// `enforce: "post"` to override that after the preset's config hook. In the dev
// server the base stays "./" (== root), which the dev file route
// (development.injectable.ts) relies on, so only the build is overridden.
function rendererBuildBasePlugin(base: string) {
  return {
    name: "freelens:renderer-build-base",
    enforce: "post" as const,
    config(_config: unknown, env: { command: string }) {
      if (env.command === "build") {
        return { base };
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: [...workspacePackages, ...bundledCjsPackages] }),
      rewriteElectronNamedImportsPlugin(),
    ],
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
    plugins: [react(), electronRenderer(), rendererBuildBasePlugin("/build/")],
    server: {
      // Same serving architecture as the webpack dev server it replaces: the
      // app window always loads through the lens proxy, which forwards to
      // this port (see development.injectable.ts). HMR websockets bypass the
      // proxy and connect straight to 127.0.0.1, like webpack's
      // client.webSocketURL did.
      host: "127.0.0.1",
      port: devServerPort,
      strictPort: true,
      cors: true, // was Access-Control-Allow-Origin: *
      allowedHosts: [".freelens.app"],
      hmr: {
        protocol: "ws",
        host: "127.0.0.1",
        port: devServerPort,
      },
    },
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
