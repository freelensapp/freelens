# Themes

A Freelens theme is a YAML file. Every theme, the built-in ones included,
has the same format: Freelens reads the files, lets the user pick one in
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
      tokens:
        "": {background: "#101214"}
        comment: "#6a737d"
        keyword: {foreground: "#c792ea", fontStyle: bold}
  light:
    colors:
      mainBackground: "#fafafa"
```

The file has the shape of a Kubernetes object:

- `apiVersion` is `freelens.app/v1` and `kind` is `Theme`. A file with another
  `apiVersion` or `kind` is refused.
- `metadata.name` identifies the theme, and is what the preferences store. It
  takes lowercase letters, digits and `-`, starts and ends with a letter or a
  digit, and is at most 63 characters long. The names of the
  [built-in themes](#built-in-themes) cannot be taken. `metadata` may also have `labels` and
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
- `editor` is the theme of the code editor (Monaco):
  - `base` is the built-in Monaco theme it extends: `vs`, `vs-dark`,
    `hc-black` or `hc-light`.
  - `inherit` keeps the token styles of the base under the ones of the theme.
  - `colors` are Monaco's editor colors, such as `editor.background`.
  - `tokens` map a Monaco token name, such as `comment`, `string` or
    `keyword.operator`, to its style. The empty name, `""`, is the style of
    every token. A style is a color, which is the foreground, or a mapping
    of `foreground`, `background` and `fontStyle` (`italic`, `bold`,
    `underline` or `strikethrough`, several of them separated by spaces)
    when more is needed.

A variant may leave out any token, and the `editor` as a whole. What it
leaves out comes from the default theme, `freelens`, in the same variant, so
a theme of a few lines is complete. The default theme defines every token:
exporting it from the preferences gives a full starting point.

In the `editor`, the same holds for each field, each editor color and each
token, so a theme can change a single token:

```yaml
editor:
  tokens:
    comment: "#6a737d"
```

A token the theme sets replaces the default theme's style of that token as a
whole: `comment: "#6a737d"` sets the foreground and drops any background or
font style the default theme gives `comment`.

Freelens ignores a color token of `colors` or `terminalColors` it does not
know, and lists it when the file is imported, so a theme written for a newer
Freelens still loads in an older one. The names in `editor.colors` and
`editor.tokens` are Monaco's, which Freelens passes on without checking.

### Colors

A color is a hex value: `#rgb`, `#rrggbb` or `#rrggbbaa`. **Quote it**: in
YAML an unquoted `#` starts a comment, so `primary: #00a7a0` leaves
`primary` empty and the file is refused. The colors of the editor's tokens
take six or eight digits only, `#rrggbb` or `#rrggbbaa`, and are quoted the
same way.

Fonts, sizes and spacing are not part of a theme.

### Accent color

The accent color the user picks in the preferences, for the dark and the
light variant each, replaces the accent tokens of whichever theme is active:
`blue`, `primary`, `buttonPrimaryBackground`, `menuActiveBackground` and
`helmStableRepo`, and in the light variant `sidebarSubmenuActiveColor` as
well. `textColorOnPrimary`, `sidebarActiveColor` and `drawerTitleText`, the
text drawn on the accent, then take white or dark text, whichever contrasts
better.

The first swatch of each row, "Theme", stands for no choice: it shows the
`primary` of the active theme in that variant, and is selected when no accent
is stored. Without a choice, the theme's own colors stay. Every other swatch,
Teal included, stores its color. A stored accent equal to the `primary` of the
active variant leaves the theme as it is too, so Teal on `freelens` looks the
same as "Theme".

## Built-in themes

Freelens comes with these themes, each with a dark and a light variant:

| `metadata.name` | Name          | Dark               | Light               |
| --------------- | ------------- | ------------------ | ------------------- |
| `freelens`      | Freelens      | Freelens           | Freelens            |
| `ayu`           | Ayu           | Ayu Dark           | Ayu Light           |
| `ayu-mirage`    | Ayu Mirage    | Ayu Mirage         | Ayu Light           |
| `dracula`       | Dracula       | Dracula Classic    | Alucard Classic     |
| `graphite`      | Graphite      | Graphite           | Graphite Light      |
| `catppuccin`    | Catppuccin    | Mocha              | Latte               |
| `solarized`     | Solarized     | Solarized Dark     | Solarized Light     |
| `high-contrast` | High Contrast | High Contrast Dark | High Contrast Light |

`freelens` is the default theme, and the theme every other one, built-in or
imported, takes the tokens it leaves out from. The other built-in themes set
every token. The Ayu themes share the same Ayu Light variant.

The preferences list the built-in themes first, in this order, then the
imported ones. A built-in theme cannot be removed, but can be exported as
the starting point of a theme of one's own, under another `metadata.name`.

The files are in `packages/core/src/features/theme/files/common/`. The Ayu
themes take their colors from [Ayu](https://ayutheme.com/), its palettes in
[ayu-colors](https://github.com/ayu-theme/ayu-colors) and its editor themes
in [vscode-ayu](https://github.com/ayu-theme/vscode-ayu), both under the MIT
License, whose notice each Ayu file carries in its header. Their text on the
accent is darker than Ayu's own, so that it reaches the WCAG AA contrast on
every accent background.

The Dracula theme takes its colors from the
[Dracula specification](https://draculatheme.com/spec): the color, UI and
ANSI palettes of Dracula Classic and Alucard Classic, and its syntax
highlighting rules for the editor. Its accent is Dracula's own purple, with
dark text on it in Dracula Classic and white text in Alucard Classic, both at
the WCAG AA contrast. The file carries the MIT notice of
[dracula-theme](https://github.com/dracula/dracula-theme) in its header.

The Graphite theme takes its colors from
[Graphite](https://graphite.rocketengine.io/), the theme for Home Assistant
by Tilman Griesel: the color tokens and the code editor colors of
[TilmanGriesel/graphite](https://github.com/TilmanGriesel/graphite).
Graphite has no terminal palette, so the ANSI colors are its named colors.
A feedback or named color that does not reach the WCAG AA contrast as text
on the backgrounds of its variant is the closest color of the same hue that
does, which darkens most of them in Graphite Light. Its accent is Graphite's
own orange, with dark text on it in both variants. The file carries the MIT
notice of Graphite in its header.

The Catppuccin theme takes its colors from
[Catppuccin](https://catppuccin.com): the colors and the ANSI colors of Mocha
and Latte in the [palette](https://github.com/catppuccin/palette), and the
editor colors and syntax highlighting of its
[VS Code port](https://github.com/catppuccin/vscode). A status or named color
that does not reach the WCAG AA contrast as text on Base is the closest color
of the same hue that does, which darkens most of them in Latte. Its accent is
Catppuccin's own Mauve, with Crust on it in Mocha and Base in Latte. The file
carries the MIT notice of Catppuccin in its header.

The Solarized theme takes its colors from
[Solarized](https://ethanschoonover.com/solarized/) by Ethan Schoonover: the
base and accent colors of
[altercation/solarized](https://github.com/altercation/solarized), with the
light variant swapping the base colors of the dark one as Solarized defines.
The terminal takes Solarized's own ANSI mapping, and the editor the syntax
groups of its Vim theme. A base color drawn as text that does not reach the
WCAG AA contrast on its background is the next base color that does, so the
secondary text is brighter in Solarized Dark, and the body text darker in
Solarized Light. A status or named color that does not reach it as text on
the background is the closest color of the same hue that does. Its accent is
Solarized blue, with base03 darkened to the WCAG AA contrast on it in both
variants. The file carries the MIT notice of Solarized in its header.

The High Contrast theme is a design of Freelens of its own, for users who
need stronger contrast than the other themes give. Its surfaces are black in
High Contrast Dark and white in High Contrast Light, with a single step for
headers and the hovered, selected and active states, and borders tell the
surfaces apart. It guarantees, in both variants:

- every color drawn as text, the secondary, tertiary and dimmed text, the
  accent and the status colors included, reaches the WCAG AAA contrast, 7:1,
  on every surface, and placeholders and the text of disabled buttons reach
  4.5:1;
- the text on the accent, of buttons and of dialog headers reaches 7:1 on its
  background;
- borders, separators and the accent reach 3:1 on every surface, and the
  selected table row, the active tab and the active sidebar item carry the
  accent as a bar, an underline or a background;
- the status colors are distinct hues: green for success, blue for
  information, red for errors, orange for soft errors and yellow for
  warnings;
- every ANSI color of the terminal, the bright ones included, reaches 7:1 on
  its background, which makes ANSI black a gray in the dark variant and ANSI
  white a gray in the light one;
- the editor extends Monaco's `hc-black` and `hc-light`, and every token
  color reaches 7:1 on the background and on the highlighted line.

Its accent is cyan with black text in the dark variant, and a deep blue with
white text in the light one.

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

## Importing a theme

"Import theme..." in Preferences → Personalization opens a dialog that takes
the URL of a theme file. The URL is `https:` or `http:`; any other scheme,
`file:` included, is refused. The folder icon next to the input, "Browse",
picks a local file instead, with the file dialog of the operating system, and
imports it as soon as it is chosen.

A theme file, from a URL or a local file, is at most 100 KiB. A larger local
file is refused without being read, and a download stops as soon as it passes
the limit, whatever size the server declares. A file or a download that is
refused leaves the dialog open with the reason, so the URL can be corrected.

The file is imported as it is, comments included, in the same way from both
sources. The URL is not recorded: a theme imported from a URL is not updated
from it later. Import it again to update it.

## Where themes live

Imported themes are files in the `themes` directory of the user data
directory of Freelens. Import copies a file there as `<metadata.name>.yaml`,
and Remove deletes it. When that would replace a file, because
`<metadata.name>.yaml` exists already (whatever it holds) or another file holds
a theme of the same name, Freelens says which and asks first. A file put there
by hand is picked up as well, while
Freelens runs. A file that is invalid, whose name is taken by another file,
or whose name is that of a built-in theme, is listed in Preferences →
Personalization with the reason and is not applied. When the selected theme
goes away, Freelens falls back to the default theme.

## Extensions

`Renderer.Theme.activeTheme` describes the active theme in the variant in
use: `name` is the theme's `metadata.name`, such as `freelens` or `ayu`, the
same in both variants, so `type` is what tells dark from light. `isDefault`
is set for the default theme only. `colors` and
`terminalColors` are complete, with the accent color applied, and
`monacoTheme` is the name the variant's editor theme is registered under in
Monaco. `clouds-midnight` stays registered as the dark editor theme of the
default theme.
