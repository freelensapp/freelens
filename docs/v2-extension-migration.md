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

## React version (host-provided, must match majors)

Freelens v2 ships **React 18.3**. React is **host-provided**: the running app
injects a single React instance and re-exports it to extensions through the
extension API (`Renderer.React` / `Renderer.ReactDOM`). Extensions must render
through that shared instance.

- **Do not bundle your own React.** Two copies of React in the same renderer
  break the [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning):
  any hook (including those inside host components you render) throws an
  "invalid hook call" at runtime. This fails only at runtime, not at build
  time, so it is easy to miss.
- Declare `react` / `react-dom` (and `@types/react*`) as **peer dependencies**
  matching the host major — `^18` for this release — and keep them out of your
  bundle (mark them external). The `@freelensapp/extensions` types already pin
  the React 18 major, so authoring against them keeps type-checking honest.
- When Freelens later bumps to React 19 (a future phase), extensions relying on
  host-provided React move with it automatically; extensions that bundled their
  own React would need a matching bump to avoid the mismatch above.

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

## Routing: `react-router` re-exports removed

Freelens v2 dropped `react-router` 5, `react-router-dom` 5, and `history` v4
from the host (Phase 2 routing modernization, #2261 — `react-router` 5 is
unmaintained and blocked the React 19 upgrade). Navigation now runs on the
in-house pieces in `@freelensapp/routing`. **This is an intended, extension-
facing breaking change:** the `Common.ReactRouter` / `Renderer.ReactRouterDom`
bundle re-exports no longer exist, so `import { Link } from "react-router-dom"`
via the Freelens bundle will fail to resolve at runtime.

If your extension used them, migrate one of two ways:

- **Preferred — use the internal navigation API.** Register pages with
  `Renderer.Registrations` (`globalPages` / `clusterPages`) and navigate with
  the injectable `navigateToRoute` / route helpers instead of react-router
  `Link` / `Redirect` / `Route`. Route schemas keep the same
  `react-router` v5 dialect (`/:param?` optionals, inline `/:param(regex)`
  patterns), matched by the in-house `matchPath`, so existing path strings are
  unchanged.
- **Or bundle your own `react-router`.** If you must keep react-router JSX, add
  `react-router` / `react-router-dom` to your extension's own dependencies and
  bundle them; do not rely on the host providing them.

See [`docs/v2-routing-modernization.md`](./v2-routing-modernization.md) (§2.5
and §5) for the rationale and the full list of what was removed.

## Chart.js v4 (`Renderer.Component.BarChart` / `PieChart`)

Freelens bundles Chart.js **v4** (previously v2.9). The `BarChart` and
`PieChart` components re-exported from `Renderer.Component` are thin wrappers
around Chart.js, so their `options` prop is a Chart.js **v4** `ChartOptions`
object. If your extension passes a chart `options` object shaped for the old
v2 API, it must be migrated. The most common changes:

- Scales are keyed objects, not arrays: `scales.xAxes: [{…}]` /
  `scales.yAxes: [{…}]` become `scales.x: {…}` / `scales.y: {…}`.
- Grid/tick styling moved: `gridLines` becomes `grid` (with the axis line
  under `border`), `ticks.fontColor` / `ticks.fontSize` become `ticks.color`
  / `ticks.font.size`.
- Tooltips moved under plugins: `options.tooltips` becomes
  `options.plugins.tooltip`, and the callback signatures now receive a single
  `TooltipItem` context (read `context.parsed.y`, `context.dataset.label`,
  `context.dataIndex`) instead of `(item, data)`.
- Doughnut/pie `cutoutPercentage: 63` becomes `cutout: "63%"`.
- Custom plugins must implement the v4 `Plugin` interface (a required `id`
  and `(chart, args, options)` hook signatures).

See the Chart.js [v3](https://www.chartjs.org/docs/latest/migration/v3-migration.html)
and [v4](https://www.chartjs.org/docs/latest/migration/v4-migration.html)
migration guides for the full list.

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

> Note: the **host's** Tailwind does not reach extensions — its JIT only scans
> core's own source, so a Tailwind class you write expecting the host to have
> emitted it produces no CSS. You are not limited to SCSS/CSS, though: an
> extension can **bring its own Tailwind** by running Tailwind in its own build
> and shipping the generated utilities in its stylesheet. See
> [Bringing your own Tailwind](#bringing-your-own-tailwind).

## Migrating off flexbox.scss

Older extensions relied on the host's in-house **flexbox utility classes**
(`flex`, `column`, `gaps`, `box`, `grow`, `align-center`, …), which the host
used to load globally. **The host no longer ships `flexbox.scss`**, so these
class names now do nothing — an element with `className="flex column"` will no
longer stack vertically, `box grow` will not grow, and so on. This is a
breaking change; extensions must provide the equivalent layout in their own
CSS.

Migrate to **plain CSS** in your own stylesheet: give the element a class and
add the equivalent declarations. Do not depend on any host-generated Tailwind
class — it is emitted only if core happens to use it. (If your extension has
substantial UI and you would rather write utilities inline, you can instead
run your own Tailwind build — see
[Bringing your own Tailwind](#bringing-your-own-tailwind) — but for a handful of
flex rules plain CSS is the lighter option.)

Legacy class → the CSS to add to your own rule:

| Legacy class(es) | CSS to add |
|---|---|
| `flex` | `display: flex` |
| `flex inline` | `display: inline-flex` |
| `flex column` / `column reverse` | `display: flex; flex-direction: column` / `column-reverse` |
| `flex reverse` | `display: flex; flex-direction: row-reverse` |
| `flex wrap` / `wrap-reverse` | `display: flex; flex-wrap: wrap` / `wrap-reverse` |
| `flex fullsize` | `width: 100vw; height: 100vh` |
| `flex auto` | `> * { flex: 1 1 0%; }` |
| `flex center` | `> * { margin: auto; }` |
| `justify-flex-start` / `-end` / `justify-space-between` / `-around` / `justify-center` | `justify-content: flex-start` / `flex-end` / `space-between` / `space-around` / `center` |
| `align-center` / `align-flex-start` / `-end` / `align-stretch` / `align-baseline` | `align-items: center` / `flex-start` / `flex-end` / `stretch` / `baseline` |
| `content-*` | `align-content: *` (same value names as `align-*`) |
| `gaps` | `gap: 8px` — the host default was `8px` (`--flex-gap`); set the value you actually need. Modern `gap` replaces the old per-child margins |
| `box grow` | `flex: 1 0` |
| `box grow-fixed` | `flex: 1 0 0` |
| `box center` | `margin: auto` |
| `box left` / `box right` | `margin-right: auto` / `margin-left: auto` |
| `box self-flex-start` / `-end` / `self-stretch` / … | `align-self: flex-start` / `flex-end` / `stretch` / … |
| bare `box` | delete it (it was only a marker for the `box *` child utilities) |

Example — a health-checks list that used to stack vertically:

```tsx
// Before (relied on the host's flexbox.scss):
<div className="KustomizationHealthChecks flex column">…</div>

// After (own CSS):
<div className={styles.healthChecks}>…</div>
```

```scss
/* your-component.module.scss */
.healthChecks {
  display: flex;
  flex-direction: column;
}
```

## Bringing your own Tailwind

The host cannot hand its Tailwind to extensions: `packages/core/tailwind.config.js`
sets `content: ["src/**/*.tsx"]` and the host CSS is generated at **host build
time**, while extensions are installed at **runtime** — the host JIT can never
see an extension's class usage, so a class only "works" if core happens to emit
it (the trap [`docs/v2-styling.md`](./v2-styling.md) warns about). But nothing
stops an extension from running **its own** Tailwind v4 build and shipping the
generated utilities in the single CSS asset the host already injects (the loader
appends your sibling `style.css`/`<entry>.css` — see
[Styling and CSS](#styling-and-css)). With three adjustments this composes with
the host's styling model and needs **no host-side changes**.

1. Add `tailwindcss` and `@tailwindcss/vite` as devDependencies and the plugin
   to your Vite config. Keep the single-CSS-asset output the styling section
   above already requires.

2. In your stylesheet entry, import Tailwind **granularly** — theme and
   utilities only, with a per-extension `prefix()`, and **never preflight**:

   ```css
   @layer theme, utilities;
   @import "tailwindcss/theme.css" layer(theme) prefix(myext);
   @import "tailwindcss/utilities.css" layer(utilities) prefix(myext);
   ```

   - **No preflight** (`tailwindcss/preflight.css`): the injected `<style>`
     applies to the whole host document, so preflight would re-reset the entire
     app.
   - **Prefix**: utilities become `myext:flex`, `myext:gap-2`, and the theme
     variables are namespaced too. This keeps two builds (host + extension) from
     emitting the same class name with diverging definitions, and makes it
     impossible to accidentally lean on a host-generated class.
   - **Layers compose**: the host declares the layer order first in `app.scss`,
     so your `@layer utilities` rules merge into the same document layer.
     Unlayered component CSS (including your own CSS Modules) still beats
     utilities, exactly as in core.

3. Bridge the host theme tokens instead of hardcoding colors, mirroring what
   core does in `tailwind.config.js`. `@theme inline` makes the utility emit the
   `var()` reference rather than a build-time value, so it re-themes at runtime:

   ```css
   @theme inline {
     --color-text-primary: var(--textColorPrimary);
     --color-text-accent: var(--textColorAccent);
   }
   ```

   The `var(--…)` custom properties are set on `:root` by the host theme system,
   so `myext:text-text-primary` re-themes automatically.

4. If you need a dark variant, wire it to the real theme mechanism the way
   `app.scss` does — there is no `.dark` class; the host toggles
   `body.theme-light`:

   ```css
   @custom-variant dark (&:where(body:not(.theme-light), body:not(.theme-light) *));
   ```

   Prefer `var(--…)` tokens over `dark:` regardless — they re-theme on their own.

Rules that follow: never use an **unprefixed** Tailwind class expecting the host
to have emitted it; keep utilities in the disposable-layout role (component
styling stays CSS Modules, host public classes stay plain-CSS targets); and for
just a few flex rules, the [plain-CSS mapping](#migrating-off-flexboxscss) above
is still lighter than wiring up a Tailwind build.

## Checklist

- [ ] Replace any direct `@freelensapp/*` internal dependency with
      `@freelensapp/extensions` (types only).
- [ ] Import stylesheets normally (side-effect or CSS-module import); drop any
      `?inline` + `<style>` CSS workaround, and make sure your build emits a
      single CSS asset next to the renderer entry.
- [ ] Replace any legacy `flexbox.scss` classes (`flex`, `column`, `gaps`,
      `box`, `grow`, `align-center`, …) with plain CSS in your own stylesheet —
      the host no longer provides them (see
      [Migrating off flexbox.scss](#migrating-off-flexboxscss)). For substantial
      UI you can instead run your own Tailwind build (see
      [Bringing your own Tailwind](#bringing-your-own-tailwind)).
- [ ] Confirm your entrypoints are ESM or CommonJS and, if ESM, that
      `package.json` declares it.
- [ ] Access only the process-appropriate namespace (`Main` in main,
      `Renderer` in the renderer, `Common` in both).
- [ ] Re-check any moved API symbols against the published type surface.
- [ ] Replace any `react-router` / `react-router-dom` usage imported via the
      Freelens bundle — the `ReactRouter*` re-exports were removed (see
      [Routing: `react-router` re-exports removed](#routing-react-router-re-exports-removed)).
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
