# Themes

A Freelens theme is a YAML file. Every theme, the built-in one included, has
the same format: Freelens reads the files, lets the user pick one in
Preferences → Personalization, import more and export any of them.

## A theme file

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/freelensapp/freelens/main/schemas/theme-v1.schema.json
apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: my-theme
spec:
  displayName: My theme
  description: Teal on near-black
  author: Jane Doe
  dark:
    colors:
      primary: "#00a7a0"
      mainBackground: "#101214"
    terminalColors:
      background: "#101214"
      foreground: "#e0e0e0"
    editor:
      base: vs-dark
      colors:
        editor.background: "#101214"
      rules:
        - token: comment
          foreground: "6a737d"
  light:
    colors:
      mainBackground: "#fafafa"
```

The file has the shape of a Kubernetes object:

- `apiVersion` is `freelens.app/v1` and `kind` is `Theme`. A file with another
  `apiVersion` or `kind` is refused.
- `metadata.name` identifies the theme, and is what the preferences store. It
  takes lowercase letters, digits and `-`, starts and ends with a letter or a
  digit, and is at most 63 characters long. `freelens` is the name of the
  built-in theme and cannot be taken. `metadata` may also have `labels` and
  `annotations`, which Freelens keeps but does not interpret.
- `spec.displayName` is the name shown in the preferences. `description` and
  `author` are optional.
- `spec.dark` and `spec.light` are the two variants. Each is optional, but a
  theme has at least one. A theme with a single variant is always shown in
  that variant, whatever the operating system's mode is.

A file holds a single YAML document, so one file is one theme. A theme
written as JSON is valid as well, since JSON is YAML.

## A variant

- `colors` are the colors of the application, by token name: `primary`,
  `mainBackground`, `textColorPrimary` and so on. Each is set as a CSS custom
  property of the same name, `--primary`.
- `terminalColors` are the colors of the terminal: `foreground`,
  `background`, `cursor`, the sixteen ANSI colors and a few more.
- `editor` is the theme of the code editor, in Monaco's own format: `base` is
  `vs`, `vs-dark` or `hc-black`, `inherit` (true when left out) keeps the
  token rules of the base, `colors` are Monaco's editor colors and `rules`
  its token rules.

A variant may leave out any token, and the `editor` as a whole. What it
leaves out comes from the built-in theme, in the same variant, so a theme of
a few lines is complete. The built-in theme defines every token: exporting
it from the preferences gives a full starting point.

Freelens ignores a token it does not know, and lists it when the file is
imported, so a theme written for a newer Freelens still loads in an older
one.

### Colors

A color is a hex value: `#rgb`, `#rrggbb` or `#rrggbbaa`. **Quote it**: in
YAML an unquoted `#` starts a comment, so `primary: #00a7a0` leaves
`primary` empty and the file is refused. The colors of the editor's token
rules are Monaco's format, `rrggbb` or `rrggbbaa`, with or without `#`.

Fonts, sizes and spacing are not part of a theme.

### Accent color

The accent color the user picks in the preferences, for the dark and the
light variant each, replaces the accent tokens of whichever theme is active:
`blue`, `primary`, `buttonPrimaryBackground`, `menuActiveBackground` and
`helmStableRepo`, and in the light variant `sidebarSubmenuActiveColor` as
well. `textColorOnPrimary`, `sidebarActiveColor` and `drawerTitleText`, the
text drawn on the accent, then take white or dark text, whichever contrasts
better. Without a choice, the theme's own colors stay.

## The JSON Schema

The schema of `apiVersion: freelens.app/v1` is
<https://raw.githubusercontent.com/freelensapp/freelens/main/schemas/theme-v1.schema.json>,
`schemas/theme-v1.schema.json` in this repository. It describes every token
and checks the whole file. It is stricter than Freelens: it rejects tokens it
does not know, so that an editor marks a misspelled one.

Editors with the YAML language server, such as VS Code with the YAML
extension, validate a file against it through the modeline on its first
line, which exported themes carry:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/freelensapp/freelens/main/schemas/theme-v1.schema.json
```

A theme written as JSON points at it with a `$schema` field. In CI, any JSON
Schema validator for draft 2020-12 checks a theme against the same file.

The schema is generated from the one the application validates with, and a
test fails when the committed file differs from it. After changing the
schema or a token, update the file with `pnpm test:unit:updatesnapshot`.

## Where themes live

Imported themes are files in the `themes` directory of the user data
directory of Freelens. Import copies a file there as `<metadata.name>.yaml`,
and Remove deletes it. A file put there by hand is picked up as well, while
Freelens runs. A file that is invalid, or whose name is taken by another
file, is listed in Preferences → Personalization with the reason and is not
applied. When the selected theme goes away, Freelens falls back to the
built-in theme.

## Extensions

`Renderer.Theme.activeTheme` describes the active theme in the variant in
use: `name` is the theme's `metadata.name`, `freelens` for the built-in theme
in both variants, so `type` is what tells dark from light. `colors` and
`terminalColors` are complete, with the accent color applied, and
`monacoTheme` is the name the variant's editor theme is registered under in
Monaco. `clouds-midnight` stays registered as the dark editor theme of the
built-in theme.
