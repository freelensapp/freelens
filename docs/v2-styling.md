# Styling conventions in Freelens v2

This document is the canonical guide for **how to style UI in Freelens v2**.
It exists because the v2 Vite migration (see [`docs/v2-plan.md`](./v2-plan.md),
decision **D11**) carried four different styling systems forward, and without a
written contract new code drifts between them. Read this before adding or
changing any stylesheet or `className`.

## The styling systems in play

Four mechanisms coexist. They are not interchangeable — each has a distinct
role (see [Roles](#roles-which-mechanism-to-use)):

1. **Theme tokens (CSS custom properties).** The TS theme objects
   (`packages/core/src/renderer/themes/lens-dark.injectable.ts`, `lens-light…`)
   are written to `:root` as `--<name>` custom properties at runtime by
   `themes/apply-lens-theme.injectable.ts`. Everything else reads these:
   SCSS as `var(--textColorPrimary)`, Tailwind through the four bridged color
   utilities. **This layer is the one contract all other systems agree on** —
   it is what makes theming work regardless of which mechanism draws a rule.
2. **Global plain SCSS** (~200 files). Side-effect `import "./pods.scss"`,
   scoped by convention: one PascalCase root class matching the component
   (`.Pods`, `.Drawer`, `.IngressDetails`) with plain nested selectors inside.
3. **CSS Modules** (`*.module.scss`). Mangled class names via
   `generateScopedName: "[name]__[local]--[hash:base64:5]"`
   (`freelens/electron.vite.config.ts`). The component imports the generated
   name map and references `styles.someClass`.
4. **Tailwind v4** utilities. `@import "tailwindcss"` + `@config` live only in
   `packages/core/src/renderer/components/app.scss`; utility classes appear
   inline in core TSX.

The v2 migration also **removed** a fifth, legacy layer that used to overlap
Tailwind: the in-house **flexbox utilities** (`flexbox.scss` — `.flex`,
`.column`, `.gaps`, `.box`, `.grow`, `.align-center`, …). Core no longer ships
them; use Tailwind for layout. Extension authors still using those classes: see
[migrating off `flexbox.scss`](./v2-extension-migration.md#migrating-off-flexboxscss).

## Roles: which mechanism to use

| Context | Mechanism | Why |
|---|---|---|
| Theme values (colors, fonts, spacing tokens) | CSS custom properties from the TS theme system (`var(--…)`) | The single cross-system contract; the only way a value re-themes at runtime |
| **Shared components** (`packages/ui-components`) and anything an extension may restyle | Global PascalCase class + plain SCSS + `var(--…)`. **No Tailwind, no CSS Modules** | The class names (`.Tooltip`, `.Button`, `.Icon`) are **public API** — extensions target and override them; mangled ids would break that. Tailwind cannot reach here at all (see below) |
| **Core single components / full views** | CSS Modules (`*.module.scss`, mangled ids) | Component-private styling that should not leak into the global namespace |
| Local layout/spacing **inside core-only TSX** | Tailwind utilities | Throwaway layout that never needs to be themed beyond the bridged tokens or restyled from outside |
| Extensions | CSS Modules + a working injection mechanism | See [`docs/v2-extension-migration.md`](./v2-extension-migration.md#styling-and-css) |

So the answer to "Tailwind or mangled CSS ids?" is **both, with a boundary**:
Tailwind for disposable layout in core-only TSX; CSS Modules for anything that
*is* a component's styling; global classes only where the class name is part of
the public surface.

### Why Tailwind is core-only

`packages/core/tailwind.config.js` sets `content: ["src/**/*.tsx"]`, so the
Tailwind JIT scans **only core's own TSX**. A Tailwind class written in
`packages/ui-components` or in an extension that core does not *also* happen to
use produces **no CSS** — it silently does nothing. Never use Tailwind
utilities outside core TSX expecting the host to emit them. (An extension can
still run its **own** Tailwind build and ship the generated utilities in its
stylesheet — see
[Bringing your own Tailwind](./v2-extension-migration.md#bringing-your-own-tailwind).)

### Why ui-components stay global

The shared components in `packages/ui-components` all follow one pattern —
side-effect `import "./tooltip.scss"`, a global PascalCase class via
`cssNames("Tooltip", …)`, colors from `var(--…)`. Keep it. The class names are
consumed by extensions and by the host's already-loaded global stylesheet;
mangling them (CSS Modules) or moving them to Tailwind (unreachable, above)
would break that public contract.

## Layout utilities: Tailwind (flexbox.scss removed)

Core uses **Tailwind** for layout (`flex`, `items-center`, `justify-center`,
`flex-col`, `gap-*`). The legacy in-house `flexbox.scss` utilities (`.flex`,
`.column`, `.gaps`, `.box`, `.grow`, `.align-center`, …) have been **removed** —
they are no longer loaded, so those class names now do nothing.

- Use Tailwind layout utilities in core TSX; never reintroduce the legacy
  vocabulary, and do not mix vocabularies in one `className`.
- `packages/ui-components` cannot use Tailwind (the host JIT scans only core
  TSX — see above); style layout with plain rules in the component's own SCSS.
  Extensions cannot use the *host's* Tailwind either, but may run their own
  Tailwind build (see
  [Bringing your own Tailwind](./v2-extension-migration.md#bringing-your-own-tailwind)).
- Extension authors migrating code that still uses the old classes: the
  legacy-token → plain-CSS mapping lives in
  [migrating off `flexbox.scss`](./v2-extension-migration.md#migrating-off-flexboxscss).

## Tailwind configuration caveats

- **Only four theme colors are bridged into Tailwind**
  (`textAccent`, `textPrimary`, `textTertiary`, `textDimmed` in
  `tailwind.config.js`). Tailwind cannot express any other themable color —
  for those, use `var(--…)` in a stylesheet. Do not hardcode colors in
  Tailwind utilities.
- **Dark mode follows the real theme mechanism.** The theme system toggles
  `body.theme-light` (dark is the default, light adds the class). The
  Tailwind `dark:` variant is wired to that selector via `@custom-variant`
  in `app.scss`; a bare `darkMode: "class"` (expecting a `.dark` class) would
  be dead. Prefer `var(--…)` theme tokens over `dark:` variants — the token
  layer already re-themes automatically, which is why `dark:` is rarely
  needed.

### Cascade layers: what beats what

`@import "tailwindcss"` emits Tailwind's utilities into `@layer utilities` and
its preflight into `@layer base`. In the CSS cascade **unlayered rules beat
every `@layer`, regardless of specificity**. Two consequences to keep in mind:

- The global reset in `app.scss` (`*, *:before, *:after { margin: 0; padding:
  0; border: 0 }`) is wrapped in `@layer base` **on purpose**. Left unlayered it
  would override *every* margin/padding utility (`mb-5`, `ml-auto`, ...)
  app-wide — only `gap`/flex utilities, which the reset does not touch, would
  survive, which is a trap: `flex`/`gap-*` work but `m-*`/`p-*` silently do
  nothing. Keep any app-wide reset in a layer so utilities can win. Note that
  `app.scss` is parsed by the Tailwind PostCSS plugin, so use `/* */` block
  comments in it, never `//`.
- Component SCSS (global `.scss` and `*.module.scss`) is **unlayered**, so it
  still overrides Tailwind utilities without needing higher specificity. To
  override a utility, a component rule just has to exist; to let a utility take
  effect, don't fight it from unlayered CSS on the same element.

## `@apply` in stylesheets

Seven SCSS files use `@apply` (`table/react-table.scss`,
`layout/sidebar.module.scss`, `catalog/catalog.module.scss`, …), which couples
the stylesheet to the Tailwind build for rules that are usually shorter as
plain CSS (`@apply flex items-center` → `display: flex; align-items: center;`).
Avoid `@apply` in new stylesheets; prefer plain CSS so the SCSS does not depend
on the Tailwind pipeline. Existing usages can be inlined opportunistically.

## Inline styles

Inline `style={{…}}` is fine when the value is genuinely dynamic (progress-bar
widths, tree-indentation depth). Do not use it for static styling that belongs
in a stylesheet.

## Cleanup backlog (opportunistic, no big-bang migration)

- New/touched core components use idiomatic CSS Modules (one class per rule),
  not a single mangled wrapper written in the global idiom.
- Convert the same-directory inconsistent pairs first
  (`network-ingresses/`, `events/` have a `.module.scss` next to a plain
  `.scss` for structurally identical components).
- Pick **one** loading mechanism for `packages/ui-components` styles — the
  component-level side-effect import *or* the `/styles` entry re-import in
  `freelens/src/renderer/index.ts`, not both.
- Inline the seven `@apply` usages.
