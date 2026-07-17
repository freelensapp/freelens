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
// - The renderer keeps nodeIntegration (plan §1); runtimeRequireExternalsPlugin
//   (below) rewrites `electron` and node builtin imports to runtime require()
//   calls, replacing the webpack `node-commonjs` externals hook. The old
//   externals regex (byline, js-yaml, tar, ...) is dropped: those are plain JS
//   packages and are simply bundled.
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
import { builtinModules, createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const require = createRequire(import.meta.url);

const root = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(root, "static", "build"); // == webpack vars.buildDir

// Dev-server port for `electron-vite dev`. The lens proxy's dev static-file
// route (packages/core/src/main/routes/files/development.injectable.ts)
// proxies renderer requests here, exactly as it did to the webpack dev server
// before; both sides read the same environment variable.
const devServerPort = Number(process.env.FREELENS_DEV_SERVER_PORT) || 9191;

// Resolve NODE_ENV the same way the old webpack `mode` did
// (isDevelopment = process.env.NODE_ENV === "development"): anything other than
// an explicit "development" is a production build. `pnpm build:dev` sets
// NODE_ENV=development while still running `electron-vite build`, so this keys
// off NODE_ENV rather than electron-vite's command/mode.
const nodeEnv = process.env.NODE_ENV === "development" ? "development" : "production";

const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8")) as {
  dependencies: Record<string, string>;
};

// Workspace packages resolve to .ts sources (Phase 2), so they must be
// bundled rather than externalized.
const workspacePackages = Object.keys(packageJson.dependencies).filter((name) => name.startsWith("@freelensapp/"));

// CommonJS dependencies that must be bundled into the ESM main process
// because Node cannot consume them as externals at runtime:
// - @ogre-tools/*: webpack-bundled CJS whose exports are defined via
//   Object.defineProperty getters; cjs-module-lexer cannot detect them, so
//   named imports fail at ESM link time ("Named export ... not found").
// - await-lock: a CJS module that exports its class as `exports.default`.
//   Under a bundler TypeScript's esModuleInterop binds `import AwaitLock from
//   "await-lock"` to `module.exports.default` (the class), but Node's native
//   ESM interop binds the default import to the whole `module.exports` object
//   (`{ __esModule: true, default: [class] }`), so `new AwaitLock()` throws
//   "AwaitLock is not a constructor".
// Bundling lets Vite resolve the named exports and default interop at build
// time, sidestepping runtime ESM resolution.
const bundledCjsPackages = [
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

// Resolve `electron` and Node builtins to runtime require() shims for the
// renderer.
//
// The renderer keeps nodeIntegration (plan §1), so `electron` and the Node
// builtins are provided by the Electron/Node runtime and must stay
// `require(...)` calls rather than being bundled as browser modules. This
// replaces vite-plugin-electron-renderer, whose shims enumerate a module's
// exports with `Object.getOwnPropertyNames` — which, for a builtin whose
// require() returns a *function* (e.g. `require("events")` is the EventEmitter
// constructor), includes the non-enumerable function intrinsics `prototype`,
// `length` and `name`. A `prototype` named export then makes Rollup's
// CJS-interop helper `getAugmentedNamespace` (used by any bundled CommonJS
// consumer, e.g. the browserified readable-stream) redefine a function's
// non-configurable `prototype`, crashing the renderer at startup with
//   Uncaught TypeError: Cannot redefine property: prototype
//
// Mirroring freelens-example-extension/build/global-externals.js, this plugin
// instead emits explicit named exports discovered with `Object.keys`
// (enumerable own keys only — never `prototype`/`length`/`name`), so the module
// graph is fully static and deterministic. See that file for the history behind
// dropping the introspection-shim approach (intermittent MISSING_EXPORT builds).
const nodeBuiltins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

// Names to re-export from the runtime `require("electron")`. Renderer-process
// APIs resolve to real objects; main/utility-process APIs resolve to `undefined`
// in the renderer (shared code imports them and branches on their presence, as
// the old CommonJS build did). `require("electron")` returns a path string at
// build time, so these cannot be introspected and are listed explicitly, as
// vite-plugin-electron-renderer did.
const electronApiNames = [
  // Renderer-process modules
  "clipboard",
  "contextBridge",
  "crashReporter",
  "ipcRenderer",
  "nativeImage",
  "shell",
  "webFrame",
  "webUtils",
  "deprecate",
  // Main/utility-process modules (undefined in the renderer)
  "app",
  "autoUpdater",
  "BaseWindow",
  "BrowserView",
  "BrowserWindow",
  "contentTracing",
  "desktopCapturer",
  "dialog",
  "globalShortcut",
  "inAppPurchase",
  "ipcMain",
  "Menu",
  "MenuItem",
  "MessageChannelMain",
  "MessagePortMain",
  "nativeTheme",
  "net",
  "netLog",
  "Notification",
  "parentPort",
  "powerMonitor",
  "powerSaveBlocker",
  "protocol",
  "pushNotifications",
  "safeStorage",
  "screen",
  "session",
  "ShareMenu",
  "systemPreferences",
  "TouchBar",
  "Tray",
  "utilityProcess",
  "View",
  "webContents",
  "WebContentsView",
  "webFrameMain",
];

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function runtimeRequireExternalsPlugin() {
  const PREFIX = "\0freelens-runtime-external:";
  const namedExportsCache = new Map<string, string[]>();

  // Enumerable own export names of a builtin, computed once in the build's Node
  // process. Object.keys skips a function's non-configurable `prototype` (the
  // root of the getAugmentedNamespace crash) as well as `length`/`name`.
  const builtinNamedExports = (spec: string) => {
    const bare = spec.startsWith("node:") ? spec.slice(5) : spec;
    let names = namedExportsCache.get(bare);
    if (!names) {
      names = [];
      try {
        const mod = require(bare);
        if (mod && (typeof mod === "object" || typeof mod === "function")) {
          names = Object.keys(mod).filter(
            (name) => name !== "default" && name !== "__esModule" && IDENTIFIER_RE.test(name),
          );
        }
      } catch {
        // Not requireable at build time; the default export shim still works.
      }
      namedExportsCache.set(bare, names);
    }
    return names;
  };

  let isBuild = false;

  return {
    name: "freelens:runtime-require-externals",
    enforce: "pre" as const,
    config(_config: unknown, env: { command: string }) {
      isBuild = env.command === "build";
      // Keep Vite's dep pre-bundler (esbuild) from trying to resolve these as
      // browser modules; excluded ids stay external and reach resolveId below.
      return { optimizeDeps: { exclude: ["electron", ...nodeBuiltins] } };
    },
    resolveId(id: string) {
      if (id === "electron" || id.startsWith("electron/") || nodeBuiltins.has(id)) {
        return PREFIX + id;
      }
      return null;
    },
    load(id: string) {
      if (!id.startsWith(PREFIX)) return null;
      const spec = id.slice(PREFIX.length);

      // Look up `require` off the runtime global through a computed property so
      // the bundler cannot recognise a static require() call. Under Vite 8
      // (rolldown) a plain `require(spec)` — even behind a `const _r_ = require`
      // alias — is re-resolved back into this same virtual module, yielding a
      // self-referential module whose exports are all undefined. Consumers then
      // crash with "Class extends value undefined" (e.g. minipass extending
      // EventEmitter from `node:events`). Rollup (Vite 7) left the call alone,
      // hence the regression.
      const requireExpr = `globalThis[${JSON.stringify("require")}](${JSON.stringify(spec)})`;

      // Node builtins in the production build (rolldown): emit a CommonJS module
      // so `require("fs")` and friends return the real, MUTABLE runtime module
      // object. Modules like graceful-fs monkey-patch their `require("fs")`
      // result (`fs.close = ...`); an ESM shim's named exports become read-only
      // namespace bindings, which rolldown's `__toCommonJS` reconstruction turns
      // into getter-only properties, so the monkey-patch throws "Cannot set
      // property close ... which has only a getter". A real `module.exports`
      // passes the runtime object through untouched, and `import { x } from "fs"`
      // still works via rolldown's CommonJS→ESM interop.
      //
      // The dev server (Vite native ESM) does NOT do that interop: a consumer's
      // `import { Buffer } from "node:buffer"` against a `module.exports = ...`
      // module fails at runtime ("does not provide an export named 'Buffer'").
      // So in dev, emit real ESM named exports instead. graceful-fs works there
      // because Vite's dev interop hands it a mutable object.
      if (isBuild && spec !== "electron" && !spec.startsWith("electron/")) {
        return { code: `module.exports = ${requireExpr};`, moduleSideEffects: false };
      }

      // ESM shim: dev-mode Node builtins, and `electron` in every mode.
      // `require("electron")` returns a path string at build time, so its
      // exports cannot be introspected — hence the explicit `electronApiNames`
      // list — whereas builtins are introspected with `Object.keys` (enumerable
      // own keys only, never `prototype`/`length`/`name`).
      const lines = [`const _m_ = ${requireExpr};`, `export default (_m_?.default ?? _m_);`];

      if (spec === "electron") {
        for (const name of electronApiNames) {
          lines.push(`export const ${name} = _m_[${JSON.stringify(name)}];`);
        }
      } else if (!spec.startsWith("electron/")) {
        for (const name of builtinNamedExports(spec)) {
          lines.push(`export const ${name} = _m_[${JSON.stringify(name)}];`);
        }
      }

      return { code: lines.join("\n"), moduleSideEffects: false };
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
    // Unlike the renderer (a browser target, where Vite bakes in
    // process.env.NODE_ENV automatically), electron-vite does not define
    // process.env.NODE_ENV for the Node main target. Without this the packaged
    // main bundle keeps `process.env.NODE_ENV || "development"` verbatim and,
    // launched with NODE_ENV unset, resolves to "development" — so the static
    // file route proxies to the dev server (127.0.0.1:9191) and the app crashes
    // with ECONNREFUSED. Baking the value in replaces webpack's `mode`-driven
    // DefinePlugin.
    define: {
      "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    },
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
    plugins: [
      // The dev-only react-refresh Babel pass parses raw TSX and rejects the
      // legacy @observer/@injectable decorators used across the codebase
      // without this parser plugin; esbuild still performs the actual
      // decorator transform per tsconfig experimentalDecorators.
      react({ babel: { parserOpts: { plugins: ["decorators-legacy"] } } }),
      runtimeRequireExternalsPlugin(),
      rendererBuildBasePlugin("/build/"),
    ],
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
      // D11: port the Tailwind PostCSS plugin from the old webpack pipeline
      // (packages/core/webpack/renderer.ts ran sass-loader -> postcss-loader
      // with @tailwindcss/postcss -> css-loader). Vite handles the sass step
      // via sass-embedded on its own, but the PostCSS plugin must be
      // registered explicitly; without it the `@import "tailwindcss"`,
      // `@config` and `@apply` directives used across the core SCSS are left
      // unprocessed and Tailwind utilities emit no CSS.
      postcss: {
        plugins: [tailwindcss()],
      },
      // D11: preserve CSS Modules scoped names; code accesses kebab-case
      // keys, so no localsConvention. auto: /\.module\./ is Vite's default.
      modules: { generateScopedName: "[name]__[local]--[hash:base64:5]" },
    },
    worker: {
      // Monaco workers are instantiated as module workers (verified working
      // in the Electron renderer, see #1718). Reapply the runtime-require
      // externals so a worker that pulls in a Node builtin gets the same shim.
      format: "es",
      plugins: () => [runtimeRequireExternalsPlugin()],
    },
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      minify: false,
      sourcemap: true,
      // Leave `require("<node-builtin>")` calls in bundled CommonJS deps
      // untouched, so at runtime (nodeIntegration) they return the real, shared,
      // mutable Node builtin instead of a Rollup CJS-interop wrapper.
      //
      // Without this, @rollup/plugin-commonjs routes a CJS `require("fs")`
      // through getAugmentedNamespace, which returns a per-consumer object whose
      // properties are getter-only. graceful-fs then monkeypatches it
      // (`fs.close = ...`) and throws:
      //   Uncaught TypeError: Cannot set property close of #<Object> which has
      //   only a getter
      // The same wrapper path is what made a bundled readable-stream crash on a
      // builtin's non-configurable `prototype`. Keeping builtin requires literal
      // matches the old webpack `electron-renderer` target and lets patches like
      // graceful-fs mutate the one real fs the whole app shares. ESM `import`s of
      // builtins still go through runtimeRequireExternalsPlugin above.
      commonjsOptions: {
        ignore: (id) => nodeBuiltins.has(id),
      },
      rollupOptions: {
        input: resolve(root, "src/renderer/index.html"),
      },
    },
  },
});
