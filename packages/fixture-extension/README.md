# `@freelensapp/fixture-extension`

A private, deliberately minimal Freelens extension that exists to test Freelens'
own extension contract. It is never published and never installed by anybody.

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
| Types | `pnpm --filter @freelensapp/fixture-extension type:check`, run by its `build` | a re-export that disappeared from the published surface, including one that exists as a value but is not nameable as a type |
| Unit | `packages/core/src/extensions/__tests__/fixture-extension.test.tsx` | instance identity of React and mobx, the registrators, the lifecycle, `Util.fetch` reaching the host's DI |
| Integration | not yet — see [#2400](https://github.com/freelensapp/freelens/issues/2400) | the same, against a real application instance rather than a harness |

The type level is the reason
[`tsconfig.json`](./tsconfig.json) maps `@freelensapp/extensions` to the built
`../extensions/dist/extension-api.d.ts`. Left to pnpm's workspace linking it
would resolve to `packages/extensions/src/extension-api.ts` — TypeScript source,
a shape no real author ever sees — and the single bundled declaration that
consumers actually install would go unchecked.

The unit level lives in `packages/core` rather than here because its harness
needs core's `getDiForUnitTesting`, and because a workspace dependency from core
onto this package would close a cycle in the turbo task graph
(`extensions#build` → core → this package → `extensions#build`).

## What it contains

Four things, chosen because each of them breaks without a compile error:

1. a component with hooks — two React instances throw `invalid hook call`
2. an observable it creates and the host reacts to — two mobx instances do not
   throw at all, so identity is asserted as well as behaviour
3. one declarative registration (`statusBarItems`), which reaches the host only
   if the registrators and the extension lifecycle both work
4. one `Renderer.Util.fetch` call, which resolves only through the host's DI
   container

Plus [`src/contract-types.ts`](./src/contract-types.ts), which carries no runtime
code and names types out of `Common`, `Main` and `Renderer` in real signatures.
