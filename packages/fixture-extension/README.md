# `@freelensapp/fixture-extension`

A private, deliberately minimal Freelens extension that exists to test Freelens'
own extension contract. It is never published, and nothing but this
repository's integration test installs it.

## This is not a template

If you are looking for something to copy, you want
[freelens-example-extension](https://github.com/freelensapp/freelens-example-extension),
which is a separate repository and keeps that role: it is the thing that proves
the *published* `@freelensapp/extensions` package is usable from outside, under
real authoring conditions.

This package is a fixture. It is as small as the contract allows, it exports
things no real extension would export, and it will keep changing shape to follow
whatever is at risk of breaking silently. Cloning it would give you a worse
starting point than the example extension and a dependency on our test
arrangements.

## What it is for

Nothing else in this repository exercises the extension contract end to end, so
a whole class of breakage used to survive unnoticed: the host not publishing its
singletons, a namespace member that exists as a value but not as a type, a
lifecycle with no point at which an extension can register anything. A real
extension, built and loaded, fails on each of those immediately.

It is built like a real extension — `@freelensapp/extensions` is its only
dependency, and every host-provided module is mapped to
`globalThis.FreelensExtensionApi` by the bundler (see
[`vite.config.mjs`](./vite.config.mjs)) — because a fixture built any other way
proves nothing about how extensions are actually loaded.

## The three levels

| Level | Where | What it can catch |
| --- | --- | --- |
| Types | `pnpm --filter @freelensapp/fixture-extension type:check`, run by its `build` | a re-export that disappeared from the published surface, including one that exists as a value but is not nameable as a type; a tsconfig that lets one runtime environment's APIs into another's code |
| Unit | `packages/core/src/extensions/__tests__/fixture-extension.test.tsx` | instance identity of React and mobx, the registrators, the lifecycle, `Util.fetch` reaching the host's DI |
| Integration | `freelens/integration/__tests__/extensions.tests.ts`, against the `dist/` of the `pnpm build` that the packaged application needs anyway | the packaged application installing this directory in place, accepting its `engines.freelens`, and rendering its hooked status bar item with the React it publishes |

### How the type level is wired

The sources follow the layout documented for extensions in
[`docs/extensions/migrating-from-v1.md`](../../docs/extensions/migrating-from-v1.md)
("Source layout: one tsconfig per runtime environment"), and this package is
where that layout is proven:

| Directory | Runs in | `tsconfig.json` |
| --- | --- | --- |
| `src/main/` | the main process: Node and Electron | `lib: ["ES2024"]`, `types: ["node"]`, plus `src/common/` |
| `src/renderer/` | a browser page | `lib` with `DOM`, `types: []`, plus `src/common/` |
| `src/common/` | both, bundled into each entry point | `lib: ["ES2024", "WebWorker"]`, `types: []` |

`type:check` compiles all three. Common code is therefore checked three
times: by the main program, which has no DOM, by the renderer program, which has
no Node, and by its own config, which is what an editor uses for a file in
`src/common/`. It also compiles [`vite.config.mjs`](./vite.config.mjs) with the
root `tsconfig.json`, which has `checkJs` and Node, so the build configuration
is type-checked through its JSDoc types like the sources.

A config that compiles is not yet a config that separates anything, so
`type:check` also compiles the files in [`environment-tests/`](./environment-tests)
with the same settings. Each line there that must not compile carries a
`@ts-expect-error`, which inverts the check: a config that starts accepting the
line fails with an unused directive. Each of those configs extends a source
config and keeps its `include`, so the probes are compiled together with the
sources and with every declaration the sources reach. Compiled alone they would
miss a third-party declaration with `/// <reference types="node" />` or
`/// <reference lib="dom" />`, which enters a program only through an import.

| Config | Compiles | Settings of |
| --- | --- | --- |
| `environment-tests/tsconfig.main.json` | `dom-apis.ts`, `worker-apis.ts` must fail; `shared-apis.ts` must pass | `src/main/` |
| `environment-tests/tsconfig.renderer.json` | `node-apis.ts` must fail; `shared-apis.ts` must pass | `src/renderer/` |
| `environment-tests/tsconfig.json` | `node-apis.ts`, `dom-apis.ts` must fail; `shared-apis.ts` must pass | `src/common/` |

`worker-apis.ts` is the reason common code is also compiled with the main
config. `self` and `postMessage` exist in a worker and not in Node, so the
`WebWorker` lib of the common config accepts them, and only the main program
rejects them.

A Node builtin import in `src/renderer/` or `src/common/` is a lint error as
well: the repository's [`biome.jsonc`](../../biome.jsonc) applies Biome's
`noNodejsModules` rule to those two trees, as the guide recommends for any
extension.

The configs are deliberately standalone: they extend only
[`tsconfig.base.json`](./tsconfig.base.json), not the repository tsconfig, and
declare no workspace path mappings beyond one. An extension author has neither.
Their compiler-option floors are the ones documented for extension consumers in
the same guide ("tsconfig.json for an extension").

That one mapping is the entire point of the package: it points
`@freelensapp/extensions` at the built `../extensions/dist/extension-api.d.ts`.
Left to pnpm's workspace linking the specifier would resolve to
`packages/extensions/src/extension-api.ts` — TypeScript source, a shape no real
author ever sees — and the single bundled declaration that consumers actually
install would go unchecked. A re-export that goes missing from the bundle fails
`tsc` here. The declaration is produced by
`pnpm --filter @freelensapp/extensions build`, which this package's `build`
depends on through turbo.

For the same reason the package is excluded from `tsconfig.typecheck.json` at
the repository root: its `paths` map `@freelensapp/extensions` back to the
workspace source, and type-checking the fixture against that would defeat the
only thing the fixture is for. The declaration also exists only after a build,
which the type-check workflow deliberately does not run — so this package's
`tsc` belongs to its own `build`, where `pnpm build` and the unit-test workflow
both reach it.

The unit level lives in `packages/core` rather than here because its harness
needs core's `getDiForUnitTesting`, and because a workspace dependency from core
onto this package would close a cycle in the turbo task graph
(`extensions#build` → core → this package → `extensions#build`).

## What it contains

The renderer entry point, [`src/renderer/index.tsx`](./src/renderer/index.tsx),
built to `dist/renderer.js`, holds four things, chosen because each of them
breaks without a compile error:

1. a component with hooks — two React instances throw `invalid hook call`
2. an observable it creates and the host reacts to — two copies of mobx share
   their global state and keep interoperating, so the reaction fires either way;
   identity is therefore asserted as well as behaviour
3. one declarative registration (`statusBarItems`), which reaches the host only
   if the registrators and the extension lifecycle both work
4. one `Renderer.Util.fetch` call, which resolves only through the host's DI
   container

The main entry point, [`src/main/index.ts`](./src/main/index.ts), built to
`dist/main.js`, is a skeleton for the main-side contract: a `Main.LensExtension`
with a `Main.Ipc` handler and a Node builtin. Both entry points import
[`src/common/host-info.ts`](./src/common/host-info.ts), which uses only globals
both runtimes have.

Plus [`src/common/contract-types.ts`](./src/common/contract-types.ts), which
carries no runtime code and names types out of `Common`, `Main` and `Renderer`
in real signatures, and [`src/common/v1-renames.ts`](./src/common/v1-renames.ts),
which names the v2 side of every "Renamed or moved" row of the v1→v2 rename
table in [`docs/extensions/migrating-from-v1.md`](../../docs/extensions/migrating-from-v1.md#v1v2-rename-table),
with the v1 path next to each. A row added to that table gets a line there.
