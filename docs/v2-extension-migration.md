# Migrating extensions to Freelens v2

Freelens v2 breaks compatibility with the v1 extension API on purpose (see
[`docs/v2-plan.md`](./v2-plan.md), decisions D2/D5). This guide is for authors
of third-party extensions moving from v1 to v2. It is written against the
runtime-global extension API introduced in Phase 4 and is expected to be
finalized once [freelens-example-extension](https://github.com/freelensapp/freelens-example-extension)
is ported (the validation vehicle named in the plan).

## What changed, and why

- **ESM-first.** The application main process, renderer, and the extension API
  are all ES modules. Extensions load through Node's `require(esm)` (verified
  in [#1718](https://github.com/freelensapp/freelens/issues/1718) to work in
  all processes), so an extension may be authored as **ESM or CommonJS** —
  both are accepted. The one restriction: the extension entrypoint graph must
  not use top-level `await`, which synchronous loading cannot express. An
  `import()`-based main-process loader may lift this later.
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
  `"type": "module"` (or use `.mjs`); the loader handles both. Avoid top-level
  `await` in the entrypoint graph (see above).
- Do not add any other `@freelensapp/*` package as a dependency — they are
  private in v2 and are not published.
- The package declares its ~30 type-level dependencies (react, mobx,
  monaco-editor, type-fest, ...) itself, so its bundled `.d.ts` type-checks in
  your project with no extra installs — with one exception: **`electron`** is
  an optional peer dependency (a hard dependency would download the Electron
  binary into every extension install). Add it as a `devDependency` for its
  types.

## `tsconfig.json` for an extension

The bundled `extension-api.d.ts` sets two floors for consumer compilers:

- `"skipLibCheck": true` — the type dependency graph (for example
  `@ogre-tools/injectable`, which references jest types) is not clean under
  `skipLibCheck: false`, and checking it is not your job.
- `"lib": ["ES2024", "DOM", "DOM.Iterable"]` (or newer) — mobx 6.15 types
  reference `ReadonlySetLike`, which first appears in the ES2024 lib.

`"moduleResolution": "bundler"` (or `node16`/`nodenext`) both resolve the
package's `exports`.

The API namespaces work in type positions exactly as in v1:

```ts
import { Common, Renderer } from "@freelensapp/extensions";

const manifest: Common.PackageJson = { name: "my-extension", version: "1.0.0" };

function renderIcon(props: Renderer.Component.IconProps) { /* ... */ }
```

## API namespace reorganization

Because compatibility is already broken, the API namespaces are reorganized
once, at this point (D5). If your v1 extension reached into a specific
namespace path, re-check it against the current
`@freelensapp/extensions` type surface after upgrading; a symbol may have moved
between `Common`, `Main`, and `Renderer`. The concrete rename table is filled
in from the freelens-example-extension port and will be appended here.

## Styling and CSS

In v1 the extension bundler ran a `style-loader`, which injected each imported
stylesheet into the document at runtime. In v2 extensions are built by their
authors in Vite **library mode**, which does the opposite: it *extracts* CSS to
a sibling asset next to the JS entry and injects nothing. The host loads an
extension by `require()`-ing its JS entry, so without help that extracted CSS
would never reach the page — which is why early v2 extensions had to import
each stylesheet twice and inline it through a manual `<style>` tag:

```tsx
// The workaround you no longer need:
import styles from "./available-version.module.scss"; // mangled class names
import stylesInline from "./available-version.module.scss?inline"; // raw CSS text
// ...
<style>{stylesInline}</style>;
```

**The host now injects the extension's stylesheet for you.** When the renderer
loads an extension, the extension loader looks next to the renderer entry for a
sibling stylesheet — either `<entry-name>.css` (e.g. `renderer.js` →
`renderer.css`) or a `style.css` in the same folder — and, if present, appends
its contents to the document as a `<style>` element. So you can import your
SCSS the normal way and drop the `?inline` copy and the `<style>` tag:

```tsx
import styles from "./available-version.module.scss"; // class names only
// no ?inline import, no <style> tag — the host loads the emitted CSS
```

To rely on this, make your Vite library build emit **one** CSS asset next to
the renderer entry:

- Keep Vite's default single-file CSS extraction (it emits `style.css`), or
  name it after the entry. Either is picked up automatically.
- If your build splits CSS per module (for example with
  `output.preserveModules: true`), consolidate it into a single asset, or add a
  runtime CSS-injection plugin such as `vite-plugin-css-injected-by-js` (which
  embeds the CSS into the JS bundle and injects it itself — also fine, since
  extensions run in the host window).

Use **CSS Modules** (`*.module.scss`) to scope an extension's own component
styles; the class names are mangled at build time so they never collide with
the host or with other extensions. For the host's shared component classes
(`.Tooltip`, `.Button`, …), which are global and part of the public API, you
may target them directly — do not redefine them. See
[`docs/v2-styling.md`](./v2-styling.md) for the full styling model.

> Note: Tailwind utilities do **not** work in extensions. The host's Tailwind
> JIT only scans core's own source, so a Tailwind class in an extension emits
> no CSS. Write extension styles as SCSS/CSS.

## Checklist

- [ ] Replace any direct `@freelensapp/*` internal dependency with
      `@freelensapp/extensions` (types only).
- [ ] Import stylesheets normally (side-effect or CSS-module import); drop any
      `?inline` + `<style>` CSS workaround, and make sure your build emits a
      single CSS asset next to the renderer entry.
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

- The **example-extension port**, from which the namespace rename table above
  is derived.

The rolled-up, self-contained `.d.ts` for the published
`@freelensapp/extensions` (no `@freelensapp/*` imports, declared type
dependencies, namespaces usable in type positions) is done and verified
against a strict-mode scratch consumer.
