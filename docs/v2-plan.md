# Freelens v2 Plan: Vite, ESM-first, Vitest

Status: proposed (issue [#2102](https://github.com/freelensapp/freelens/issues/2102)).
Builds on the analysis and empirical verification in issue
[#1718](https://github.com/freelensapp/freelens/issues/1718).

Development happens on a long-lived `v2` branch that breaks compatibility
with v1, including the extension API.

## 1. Goals and non-goals

Goals:

- ESM-first application: main process, renderer, internal modules, and the
  new extension API are all ES modules.
- Replace webpack with Vite (electron-vite) as the only bundler.
- Replace Jest with Vitest as the only test runner.
- Single transpilation shot: the application compiles directly from
  TypeScript sources of all workspace packages. No package produces `dist/`,
  no transpiled JavaScript is transpiled again.
- Keep the extension feature. The new extension API may break compatibility
  and is validated against
  [freelens-example-extension](https://github.com/freelensapp/freelens-example-extension).

Explicit non-goals for the first phase (allowed to be red or disabled):

- Integration tests, unit tests, knip check, and auxiliary GitHub Action
  checks.
- Splitting the renderer and main contexts. The renderer keeps
  `nodeIntegration` and its runtime `require()` usage.
- Reducing the number of workspace packages. Collapsing packages (up to a
  single workspace) remains an available option, not a requirement.
- Styling or theming refactors beyond what the build migration forces.

## 2. Verified facts this plan relies on

From the empirical verification in #1718, executed with the real Electron
binary from this repository:

- Electron 41 embeds Node.js 24, where `require(esm)` is stable: CommonJS
  code can synchronously `require()` ES modules without top-level await.
- ESM-only dependencies load in the main process, in the node-integrated
  renderer, and inside `<script type="module">`: `@kubernetes/client-node`,
  `openid-client`, `node-fetch`. The `require` global stays available in
  module scripts.
- ES module Web Workers (`new Worker(..., { type: "module" })`) work in the
  Electron renderer, which covers Monaco Editor workers.
- Electron supports ESM in the main process since version 28; renderers use
  Chromium's native ESM loader, which is exactly what Vite emits.

Current tree facts:

- 52 `@freelensapp/*` workspace packages, ~40 built with
  `lens-webpack-build`; `packages/core` additionally builds a webpack
  library bundle consumed by the published `@freelensapp/extensions`.
- 33 `jest.config.js` files; Jest 29 with `ts-jest`, a custom resolver
  (`jest-28-resolver.js`), and `@side/jest-runtime` — all of which exist to
  work around ESM-in-CommonJS limitations that Vitest does not have.
- `packages/transpilation/{kubernetes-client-node,node-fetch,openid-client}`
  are webpack shims that bundle ESM-only dependencies to CommonJS.
- Extensions are loaded at runtime with CommonJS
  `require()` in `extension-loader.ts`.

## 3. Technical decisions

### D1. Bundler: electron-vite on Vite 7

Use [electron-vite](https://electron-vite.org/) (currently 5.x) as the
orchestrator for main, preload, and renderer builds, on Vite 7 (the newest
major in electron-vite's peer range; Vite 8 / rolldown-vite is adopted later
when electron-vite supports it). It replaces the whole `freelens/webpack/`
directory, `packages/core/webpack/` (library bundle), and
`packages/infrastructure/webpack`.

- Main process: ESM output, `externalizeDepsPlugin` with
  `@freelensapp/*` workspace packages excluded from externalization so they
  are bundled from TypeScript source.
- Renderer: Vite-native ESM output with `nodeIntegration` preserved. The
  current webpack externals list for node-consumed modules is carried over.
- Vite does not type-check during builds; type-checking is a separate step
  (see D6). The circular-dependency guard
  (`circular-dependency-plugin`, currently patched) is replaced with a
  Rollup-side equivalent (e.g. `vite-plugin-circular-dependency`) or a CI
  check; the patch is dropped.

### D2. Module format: ESM everywhere, no context split

- `"type": "module"` in `freelens/package.json` and all workspace packages.
- Main process ships as ESM (supported since Electron 28).
- Renderer ships as Vite-native ESM. Verified: `require()` remains available
  in module scripts under `nodeIntegration`, so the mixed context keeps
  working without a renderer/main split.
- The extension loader switches from `require(path)` to
  `await import(pathToFileURL(path))`, which loads both CommonJS and ESM
  extensions, including graphs with top-level await.

### D3. Single transpilation shot from TypeScript sources

- Every workspace package points `main`/`types`/`exports` at
  `./src/index.ts` and loses its build step. `@freelensapp/webpack` and all
  per-package `dist/` outputs are removed.
- `packages/core`'s library bundle is deleted; core is consumed as source
  like every other package.
- `packages/transpilation/*` is deleted; code imports
  `@kubernetes/client-node`, `openid-client`, and `fetch` directly (~11
  import sites).
- The 9 `@freelensapp/*/styles` artifact imports in
  `freelens/src/renderer/index.ts` become direct `.scss` source imports that
  Vite compiles.
- Turbo's role shrinks to almost nothing (one build); it is removed or kept
  only as a script runner — decided during Phase 5 cleanup.

### D4. Workspace shape: keep the monorepo, publish one package

- The pnpm monorepo layout stays as-is for v2.0. Since packages are consumed
  as TypeScript source, collapsing them later is a mechanical `git mv`, not
  a build-system change. Internal isolation is preserved by TypeScript
  project boundaries and per-package Vitest projects (D8).
- All packages become `private: true` except `@freelensapp/extensions`,
  which is the only published package.

### D5. Extension API: runtime global plus published types

- The app assigns the API object at startup in each process:
  `globalThis.FreelensExtensionApi = { Common, Main }` in main and
  `{ Common, Renderer }` in the renderer.
- The published `@freelensapp/extensions` package contains generated `.d.ts`
  (rolled up into a self-contained declaration, e.g. with
  `rollup-plugin-dts`) plus a tiny ESM shim re-exporting
  `globalThis.FreelensExtensionApi`. Extensions use it as a dependency for
  types; at runtime the shim resolves to the global regardless of whether
  the extension bundles it or marks it external.
- Extensions may be authored as ESM or CommonJS; the `import()`-based loader
  accepts both. Since compatibility is already broken, API namespaces are
  reorganized once, at this point.
- Validation vehicle: freelens-example-extension is ported first; the
  migration guide for third-party extensions is written from that port.

### D6. TypeScript: start on 5.9, adopt TypeScript 7 as the type-checker

Vite transpiles with esbuild, so the TypeScript compiler is only used for
type-checking and for the extension-api declaration emit. That decouples the
TypeScript version from the build:

- Start on TypeScript 5.9 (current, known-good with all types in the tree).
- Adopt TypeScript 7 (native/tsgo, GA as 7.0.x) as the type-checker as soon
  as the repository type-checks cleanly under it — a swap of the `tsc`
  binary in one script, independent of the bundler and the runtime.
- Declaration emit for `@freelensapp/extensions` stays on whichever compiler
  produces correct rolled-up output; it may lag the type-checker version.

### D7. Electron: any ESM-supporting version, tracked forward

Current Electron 41 (Node 24) already provides everything required
(`require(esm)`, ESM main, module workers). v2 sets Electron ≥ 41 as the
floor and upgrades to the latest stable (43.x at the time of writing)
opportunistically; nothing in this plan depends on a specific version above
that floor.

### D8. Tests: Vitest 4 with a single root projects config

Replace Jest 29 across the repository with Vitest 4:

- One root `vitest.config.ts` using `projects`
  replaces the 33 `jest.config.js` files and the shared
  `packages/infrastructure/jest` package. Per-package projects preserve the
  ability to run and isolate each package's tests separately (relevant to
  D4's optional future package-collapse).
- Vitest runs on the same Vite pipeline as the app, so an entire layer of
  Jest workarounds is deleted rather than migrated: `ts-jest`, the custom
  `jest-28-resolver.js`, `@side/jest-runtime`, `transformIgnorePatterns`
  hacks for ESM-only packages, and CSS/asset `moduleNameMapper` entries
  (Vite resolves these natively).
- Dependency mapping:
  - `@async-fn/jest` (patched via pnpm) → `@async-fn/vitest` (published,
    same version line; the pnpm patch is expected to be droppable — verify
    during migration). ~144 usages, import-path change only.
  - `jest-mock-extended` → `vitest-mock-extended`.
  - `@testing-library/jest-dom` → its `/vitest` entry point.
  - `jest-canvas-mock` → `vitest-canvas-mock`.
  - `jest-environment-jsdom` → `environment: "jsdom"`.
  - Coverage stays provider `v8`, reporter `lcov`
    (`@vitest/coverage-v8`).
- Mechanics are mostly mechanical (`jest.fn/mock/spyOn` →
  `vi.fn/mock/spyOn`, globals enabled for the transition); snapshots are
  regenerated wholesale on the `v2` branch and reviewed.
- Timing: the framework swap (configs, dependencies, codemod) happens early
  so nothing new is written for Jest, but making all suites green is
  explicitly deferred out of the MVP (see non-goals).
- Test-run cost: because every `packages/core` test file re-evaluates the
  eagerly-globbed injectable graph from TypeScript source, the core project
  dominates wall-clock (~57% of aggregate worker time is module `import`).
  The interim mitigation is CI sharding of the core project (`vitest run
  --shard`) across a matrix, with the shard count derived from the runner's
  CPU/memory. The structural fixes — `isolate: false`, or externalizing the
  `@freelensapp/*` packages for the test run — are deferred (see the
  extension-api-di item in Phase 7 and §6).

### D9. CI on the v2 branch: trimmed, re-enabled gradually

- Required on `v2` initially: type-check (`tsc --noEmit`), lint
  (biome/trunk), and a successful `electron-vite` app build
  (`build:app:dir`).
- Disabled initially: unit tests, integration tests, knip, and auxiliary
  checks. Each is re-enabled in Phase 6/7 once green.

### D10. Keep the explicit DI registration generator

The `pnpm build:di` explicit-registration system is bundler-agnostic and
migrates as-is. Replacing it with Vite's `import.meta.glob` is a possible
later simplification, out of scope for v2.0.

### D11. CSS pipeline ported faithfully

Same CSS Modules scoped naming (`[name]__[local]--[hash:base64:5]`), no
`localsConvention` change (code accesses kebab-case keys), Tailwind PostCSS
plugin and sass modern API carried into Vite's `css` config. Monaco workers
are configured via `MonacoEnvironment.getWorker` with module workers; JSON
and YAML editing must reach feature parity (YAML remains basic-languages
colorization, as today).

## 4. Phases

Phase ordering; each phase lands as one or more PRs against `v2`:

1. **Phase 0 — branch and CI trim.** Create `v2` from `main`; PRs target
   `v2`. Trim workflows per D9.
2. **Phase 1 — electron-vite skeleton.** `freelens/electron.vite.config.ts`
   with main + renderer per D1/D2; dev server with HMR and a packaged build
   that boots. Thanks to the #1718 verification this is assembly of proven
   parts, not a risk spike.
3. **Phase 2 — source-only packages.** Scripted codemod over all ~40 built
   packages per D3; replace the 9 `…/styles` imports; delete
   `packages/transpilation` and re-point its ~11 import sites; solution-wide
   `tsc --noEmit` as the type-check.
4. **Phase 3 — ESM flip.** `"type": "module"` across the workspace; ESM
   main output; extension loader moves to `import()`; Monaco module
   workers.
5. **Phase 4 — extension API.** Runtime global, published
   `@freelensapp/extensions` (d.ts rollup + shim), port
   freelens-example-extension, draft the adaptation guide.
6. **Phase 5 — cleanup.** Delete `freelens/webpack/`,
   `packages/core/webpack/`, `packages/extensions/webpack/`,
   `packages/infrastructure/webpack`; flip internal packages to private;
   prune `@freelensapp/*` from `electron-builder` file lists; drop the
   `circular-dependency-plugin` patch; decide Turbo's fate.
7. **Phase 6 — Vitest.** Swap per D8; drive unit suites green package by
   package; re-enable unit tests in CI.
8. **Phase 7 — hardening.** TypeScript 7 as type-checker (D6), knip
   re-enabled, integration tests restored, extension migration guide
   published. Remove `@freelensapp/legacy-global-di` — done: its
   responsibility (lazy singletons for the extension API) moved into core as
   `packages/core/src/extensions/extension-api-di`, since the extension API
   namespaces are built on lazy injection and must keep working. The
   module-level `Map<Environments, DiContainer>` still exists there and
   remains one of the blockers for running the Vitest core project with
   `isolate: false`; now that it is core-internal it can grow a reset hook
   for the test runner. Re-analyze the test-run cost remediations
   (`isolate: false`, externalizing/prebundling the `@freelensapp/*`
   packages for tests, environment reclassification) and pick the
   structural fix that replaces the interim CI sharding.

Dependencies: 0 → 1 → 2 → 3 → 4 → 5; 6 can start any time after 2 (config
swap) but completes after 3; 7 is last.

## 5. MVP

The MVP proves the direction and nothing more. Scope: Phases 0–4, with
Phase 4 reduced to the example extension loading.

Success criteria:

1. The application is compiled only from TypeScript, in exactly one
   transpilation step (plus one `tsc --emitDeclarationOnly` for extension
   types, which is type emit, not application code transpilation).
2. `pnpm start` runs the app through electron-vite dev with HMR.
3. `pnpm build:app:dir` produces a packaged app that starts, connects to a
   cluster, and edits a resource in Monaco (JSON and YAML).
4. Main and renderer are ESM; `packages/transpilation` is gone; ESM-only
   dependencies are imported directly.
5. The ported example extension installs and renders UI through the runtime
   global.
6. CI on `v2`: type-check, lint, and app build green; tests, knip, and
   integration checks allowed red or disabled.

## 6. Risks and watch items

- **electron-vite version lag.** electron-vite 5 caps at Vite 7; Vite 8
  (rolldown) waits for upstream support. Cost of waiting: none functional.
- **Top-level await in externalized main-process deps.** `require(esm)`
  rejects TLA graphs. Bundled deps are unaffected; any externalized dep that
  adopts TLA must be bundled or `import()`ed. One-line note in
  CONTRIBUTING/CI, not a blocker.
- **Declaration emit for the extension API.** `extension-api.ts` reaches
  `.scss`/asset imports, which declaration emit rejects without ambient
  module declarations or a dts plugin that stubs them; and the d.ts rollup
  must produce a self-contained file with no `@freelensapp/*` imports
  (internal packages become private). This is the fiddliest deliverable of
  Phase 4.
- **`@async-fn/vitest` parity.** The Jest variant is patched in this repo;
  confirm the Vitest variant doesn't need an equivalent patch before
  deleting it.
- **Snapshot churn.** Wholesale regeneration on `v2` makes review noisy;
  regenerate per package during Phase 6, not in one commit.
- **TypeScript 7 type-check differences.** tsgo may surface new errors or
  behave differently on the more exotic types in the tree; that is why it
  is adopted as a checker swap (D6) rather than a prerequisite.
- **Vitest core-project cost and `isolate: false`.** The core project's
  per-file re-evaluation of the injectable graph makes the Vitest run ~2–3x
  slower than the Jest era. CI sharding is the interim relief; the structural
  fix (`isolate: false`) is blocked today by shared module-level state,
  notably the extension API DI container map (now core-internal in
  `packages/core/src/extensions/extension-api-di`) and testing-library
  cleanup that only attaches on the first file. With the map inside core it
  can be reset between test files as part of that re-analysis.
