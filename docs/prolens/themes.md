# Themes

ProLens themes are `LensTheme` declarations registered with
`lensThemeDeclarationInjectionToken`. The theme system applies the active
theme's colours as CSS custom properties on `<html>` (`--primary`,
`--mainBackground`, …), which every stylesheet reads; see
[`../styling.md`](../styling.md).

## Built-in themes

ProLens Dark (the default), ProLens Light, Midnight, Graphite, Nord, Aurora
and High Contrast are written as palettes of about twenty semantic tokens in
`packages/core/src/renderer/themes/prolens/palettes.ts`. `createTheme` derives
every colour token from a palette, so a new theme is one more palette. The
classic Freelens "Dark" and "Light" themes remain available.

"System" (the `system` value of the `colorTheme` preference) follows the
operating system between ProLens Dark and ProLens Light.

## Appearance preferences

Preferences → App → Theme also sets:

- **Accent colour**: replaces the accent tokens of whichever theme is active.
- **Density**: Compact tightens spacing through `html[data-density="compact"]`
  in `app.scss`. Row heights of virtualized lists are fixed in code and do not
  change.
- **Font size**: sets `--font-size`, `--font-size-small` and
  `--font-size-big`.

## Custom themes

A custom theme is a JSON file:

```json
{
  "name": "Ocean",
  "type": "dark",
  "extends": "Nord",
  "colors": { "primary": "#00b4d8", "mainBackground": "#0b1d2a" },
  "terminalColors": { "background": "#06131c" }
}
```

- `name` must not be the name of a built-in theme.
- `type` is `dark` or `light`.
- `extends` names the theme it starts from; without it, the ProLens theme of
  the same type.
- `colors` and `terminalColors` override tokens of that theme. Unknown tokens
  are ignored and listed when the file is imported.

Import and export are in Preferences → App → Theme. "Export current theme"
writes every token of the active theme, which is a complete starting point.
Custom themes are stored in the `customThemes` preference and can also be
chosen as the terminal theme.
