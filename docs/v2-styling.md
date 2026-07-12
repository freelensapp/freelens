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

A fifth, legacy layer overlaps Tailwind: the in-house **flexbox utilities**
(`packages/core/src/renderer/components/flexbox.scss` — `.flex`, `.column`,
`.gaps`, `.align-center`, `.box`, `.grow`). They predate Tailwind and are still
loaded globally. See [Utility vocabulary](#utility-vocabulary-flexboxscss-vs-tailwind).

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
utilities outside core TSX.

### Why ui-components stay global

The shared components in `packages/ui-components` all follow one pattern —
side-effect `import "./tooltip.scss"`, a global PascalCase class via
`cssNames("Tooltip", …)`, colors from `var(--…)`. Keep it. The class names are
consumed by extensions and by the host's already-loaded global stylesheet;
mangling them (CSS Modules) or moving them to Tailwind (unreachable, above)
would break that public contract.

## Utility vocabulary: flexbox.scss vs Tailwind

The most common inconsistency today is mixing three utility vocabularies in a
single `className`, e.g. `className="flex justify-center Welcome align-center"`
— `justify-center` is Tailwind, `align-center` is legacy `flexbox.scss`,
`Welcome` is a global component class. Near-synonyms (`align-center` vs
`items-center`, `column` vs `flex-col`) invite silent mistakes.

Convention going forward:

- **In new or touched core TSX, use Tailwind for layout utilities**
  (`flex`, `items-center`, `justify-center`, `flex-col`, `gap-*`). Do not
  reach for `flexbox.scss` classes.
- **Do not delete `flexbox.scss`.** Its classes are extension-visible
  (shared components such as `error-boundary` ship `"flex column gaps"`), so
  removing it is a breaking change. It is **frozen**: no new usages in core,
  migrate existing ones opportunistically.
- Do not mix the two vocabularies in the same `className`.

### Legacy-to-Tailwind mapping

When migrating an existing `className`, translate each legacy token as
follows. Migrate a container **together with its flex children in the same
change** — the two systems coexist during the migration and the legacy
compound selectors (`.flex.gaps > :not(:last-child)`, `.flex > .box.grow`) win
on specificity, so a half-migrated subtree double-spaces or loses `grow`.

| Legacy | Tailwind | Note |
|---|---|---|
| `flex` | `flex` | Same name, same rule |
| `flex inline` | `inline-flex` | |
| `flex column` / `column reverse` | `flex flex-col` / `flex-col-reverse` | |
| `flex reverse` | `flex flex-row-reverse` | |
| `flex wrap` / `wrap-reverse` | `flex flex-wrap` / `flex-wrap-reverse` | |
| `flex fullsize` | `flex w-screen h-screen` | |
| `flex auto` | `flex-1` on each child | Parent-side rule has no Tailwind equivalent |
| `flex center` | `items-center justify-center` on parent | Legacy sets `margin: auto` per child; verify multi-child sites |
| `justify-flex-start` / `-end`, `justify-space-between` / `-around` | `justify-start` / `end`, `justify-between` / `around` | |
| `align-center`, `align-flex-start` / `-end`, `align-stretch`, `align-baseline` | `items-center`, `items-start` / `end`, `items-stretch`, `items-baseline` | |
| `content-flex-start` / `-end`, `content-space-between` / `-around`, `content-stretch` | `content-start` / `end`, `content-between` / `around`, `content-stretch` | |
| `gaps` | `gap-*` on the container | Legacy `gaps` is margin-based and parametrized by `--flex-gap`; compute the effective value and set an explicit `gap-*`. Real `gap` also applies between wrapped lines — check wrapping containers |
| `box grow` | `grow shrink-0` (exact: `flex: 1 0`) or `flex-1` where shrinking is fine | Do not translate to bare `grow` — legacy forbids shrinking |
| `box grow-fixed` | `grow shrink-0 basis-0` | `flex: 1 0 0` |
| `box center` | `m-auto` | |
| `box left` / `box right` | `mr-auto` / `ml-auto` | |
| `box self-flex-start` / `-end`, `self-stretch`, ... | `self-start` / `end`, `self-stretch`, ... | |
| bare `box` | usually delete | Except where a stylesheet structurally selects `.box` (`confirm-dialog`, `checkbox`, `notifications`) — give those elements a named class and rewrite the selector in the same change |

Do not translate legacy utilities to Tailwind in `packages/ui-components` or
extensions: the Tailwind JIT only scans core TSX (see above), so those classes
would produce no CSS. Replace them with plain rules in the component's own
SCSS.

### Ratchet guardrail

`scripts/check-legacy-flexbox.mjs` counts legacy flexbox tokens in core TSX
`className` attributes and fails when the count rises above the committed
baseline in `scripts/legacy-flexbox-baseline.json`. This keeps new mixed
classnames out while the migration proceeds in batches. After a batch lowers
the count, ratchet the baseline down:

```bash
node scripts/check-legacy-flexbox.mjs           # verify (CI)
node scripts/check-legacy-flexbox.mjs --update   # lower the baseline
```

The endgame is a baseline of `0`, a deprecation notice on `flexbox.scss`, and
removal in a later major after an extension audit.

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
