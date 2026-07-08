# Migrating extensions to Freelens v2

Freelens v2 breaks compatibility with the v1 extension API on purpose (see
[`docs/v2-plan.md`](./v2-plan.md), decisions D2/D5). This guide is for authors
of third-party extensions moving from v1 to v2. It is written against the
runtime-global extension API introduced in Phase 4 and is expected to be
finalized once [freelens-example-extension](https://github.com/freelensapp/freelens-example-extension)
is ported (the validation vehicle named in the plan).

## What changed, and why

- **ESM-first.** The application main process, renderer, and the extension API
  are all ES modules. Extensions load through `await import(pathToFileURL(...))`
  instead of `require()`, so an extension may be authored as **ESM or
  CommonJS** — both are accepted, including graphs with top-level `await`.
- **One published package.** `@freelensapp/extensions` is the only published
  package. Every other `@freelensapp/*` package is `private` and is consumed by
  the app as TypeScript source. Extensions must not depend on internal
  `@freelensapp/*` packages directly.
- **Runtime-global API.** The app assigns the API object to a global at startup
  in each process:

  ```ts
  // main process   (freelens/src/main/index.ts)
  globalThis.FreelensExtensionApi = { Common, Main };
  // renderer       (freelens/src/renderer/index.ts)
  globalThis.FreelensExtensionApi = { Common, Renderer };
  ```

  `@freelensapp/extensions` is a thin shim that re-exports that global. At
  runtime the members resolve to the global whether your bundle inlines the
  shim or marks it external.

## Import changes

The import specifier is unchanged — you still import from
`@freelensapp/extensions`:

```ts
import { Common, Main, Renderer } from "@freelensapp/extensions";
```

What changed is what those names resolve to at runtime:

- In the **main** process, `Common` and `Main` are defined; `Renderer` is
  `undefined`.
- In the **renderer**, `Common` and `Renderer` are defined; `Main` is
  `undefined`.

Only touch the namespace for the process your code runs in — this matches v1
behaviour, where a `Main`-only extension entrypoint never reached renderer APIs.
The published types still expose the full surface (`Common` / `Main` /
`Renderer`) so authoring against all three in a single-package extension keeps
type-checking, even though the wrong-process namespace is `undefined` at
runtime.

## `package.json` for an extension

- Depend on `@freelensapp/extensions` for **types**. You do not need to bundle
  it; the API is provided by the host through the runtime global.
- Author your entrypoints as ESM or CommonJS. If you ship ESM, set
  `"type": "module"` (or use `.mjs`); the `import()`-based loader handles both.
- Do not add any other `@freelensapp/*` package as a dependency — they are
  private in v2 and are not published.

## API namespace reorganization

Because compatibility is already broken, the API namespaces are reorganized
once, at this point (D5). If your v1 extension reached into a specific
namespace path, re-check it against the current
`@freelensapp/extensions` type surface after upgrading; a symbol may have moved
between `Common`, `Main`, and `Renderer`. The concrete rename table is filled
in from the freelens-example-extension port and will be appended here.

## Checklist

- [ ] Replace any direct `@freelensapp/*` internal dependency with
      `@freelensapp/extensions` (types only).
- [ ] Confirm your entrypoints are ESM or CommonJS and, if ESM, that
      `package.json` declares it.
- [ ] Access only the process-appropriate namespace (`Main` in main,
      `Renderer` in the renderer, `Common` in both).
- [ ] Re-check any moved API symbols against the published type surface.
- [ ] Load your extension in a v2 build and verify its UI renders through the
      runtime global.

## Still pending (tracked in Phase 4/7)

These items are finalized as the migration is validated end-to-end and are
noted here so the guide is honest about what is not yet locked:

- The **rolled-up, self-contained `.d.ts`** for the published
  `@freelensapp/extensions` (no `@freelensapp/*` imports) — the fiddliest
  Phase 4 deliverable (plan §6).
- The **example-extension port**, from which the namespace rename table above
  is derived.
