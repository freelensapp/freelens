/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Ajv2020 from "ajv/dist/2020";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { getContrastRatio } from "../../../../../renderer/themes/accent-colors";
import {
  builtInThemes,
  defaultTheme,
  defaultThemeName,
  defaultThemeSource,
  findBuiltInTheme,
  isBuiltInThemeName,
} from "../builtin-theme";
import { parseThemeFile, serializeThemeFile } from "../parse";
import {
  getAvailableVariants,
  getEffectiveVariant,
  getMonacoTokenRules,
  resolveEditorTheme,
  resolveThemeVariant,
} from "../resolve";
import { getThemeFileJsonSchema, themeSchemaUrl } from "../schema";
import { lensColorNames, terminalColorNames } from "../token-descriptions";

import type { ThemeFile } from "../schema";

const minimal = (variants: string) => `apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: my-theme
spec:
  displayName: My theme
${variants}`;

const darkOnly = minimal(`  dark:
    colors:
      primary: "#ff0000"
`);

const parseValid = (content: string): ThemeFile => {
  const result = parseThemeFile(content);

  if (!result.isValid) {
    throw new Error(result.error);
  }

  return result.theme;
};

const getError = (content: string) => {
  const result = parseThemeFile(content);

  if (result.isValid) {
    throw new Error("expected the file to be invalid");
  }

  return result.error;
};

/**
 * JSON as Biome formats it, so that the committed file passes `biome check` unchanged: objects
 * expanded, arrays of plain values on one line when they fit into 120 columns.
 */
const formatJson = (value: unknown, indent = "", prefixLength = 0): string => {
  const inner = `${indent}  `;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (value.every((item) => item === null || typeof item !== "object")) {
      const inline = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;

      if (prefixLength + inline.length + 1 <= 120) {
        return inline;
      }
    }

    return `[\n${value.map((item) => `${inner}${formatJson(item, inner, inner.length)}`).join(",\n")}\n${indent}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return "{}";
    }

    return `{\n${entries
      .map(([key, item]) => {
        const prefix = `${inner}${JSON.stringify(key)}: `;

        return `${prefix}${formatJson(item, inner, prefix.length)}`;
      })
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
};

const createValidator = () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });

  return ajv.compile(getThemeFileJsonSchema());
};

describe("theme files", () => {
  describe("parsing", () => {
    it("accepts a theme with a single variant and few tokens", () => {
      const theme = parseValid(darkOnly);

      expect(theme.metadata.name).toBe("my-theme");
      expect(theme.spec.dark?.colors?.primary).toBe("#ff0000");
      expect(theme.spec.light).toBeUndefined();
    });

    it("accepts a theme written as JSON", () => {
      const json = JSON.stringify(yaml.load(darkOnly));

      expect(parseValid(json).spec.dark?.colors?.primary).toBe("#ff0000");
    });

    it("refuses a theme without any variant", () => {
      expect(getError(minimal(""))).toContain("a theme needs a dark variant, a light variant or both");
    });

    it("explains an unquoted color, which YAML reads as a comment", () => {
      const error = getError(
        minimal(`  dark:
    colors:
      primary: #ff0000
`),
      );

      expect(error).toContain("spec.dark.colors.primary");
      expect(error).toContain("has to be quoted");
    });

    it.each(["red", "#12", "#1234567", "00a7a0"])("refuses the color %s", (color) => {
      expect(
        getError(
          minimal(`  dark:
    colors:
      primary: "${color}"
`),
        ),
      ).toContain("expected a hex color");
    });

    it.each(["#abc", "#aabbcc", "#aabbcc80", "#AABBCC"])("accepts the color %s", (color) => {
      expect(
        parseThemeFile(
          minimal(`  dark:
    colors:
      primary: "${color}"
`),
        ).isValid,
      ).toBe(true);
    });

    it("refuses another apiVersion with a message", () => {
      expect(getError(darkOnly.replace("freelens.app/v1", "freelens.app/v2"))).toBe(
        'Unsupported apiVersion "freelens.app/v2": expected "freelens.app/v1"',
      );
    });

    it("refuses another kind with a message", () => {
      expect(getError(darkOnly.replace("kind: Theme", "kind: Deployment"))).toBe(
        'Unsupported kind "Deployment": expected "Theme"',
      );
    });

    it.each(["My-Theme", "my_theme", "-theme", "theme-", "", "a".repeat(64)])("refuses the name %j", (name) => {
      expect(getError(darkOnly.replace("name: my-theme", `name: "${name}"`))).toContain("metadata.name");
    });

    it("refuses a file with more than one document", () => {
      expect(getError(`${darkOnly}---\n${darkOnly}`)).toContain("2 YAML documents");
    });

    it("refuses an empty file", () => {
      expect(getError("")).toBe("The file is empty");
    });

    it("refuses invalid YAML", () => {
      expect(getError("a: [")).toContain("Invalid YAML");
    });

    it("keeps labels and annotations", () => {
      const theme = parseValid(
        darkOnly.replace("  name: my-theme", "  name: my-theme\n  labels:\n    a: b\n  annotations:\n    c: d"),
      );

      expect(theme.metadata.labels).toEqual({ a: "b" });
      expect(theme.metadata.annotations).toEqual({ c: "d" });
    });

    it("ignores unknown tokens and lists them", () => {
      const result = parseThemeFile(
        minimal(`  dark:
    colors:
      primary: "#ff0000"
      primaryy: "#ff0000"
    terminalColors:
      neon: "#ff0000"
`),
      );

      expect(result).toMatchObject({
        isValid: true,
        unknownTokens: ["dark.colors.primaryy", "dark.terminalColors.neon"],
      });
    });

    it("refuses an editor theme with an unknown base", () => {
      expect(
        getError(
          minimal(`  dark:
    editor:
      base: solarized
`),
        ),
      ).toContain("spec.dark.editor.base");
    });

    it("accepts editor tokens as a color or as a style", () => {
      const theme = parseValid(
        minimal(`  dark:
    editor:
      tokens:
        "": { background: "#191919" }
        comment: "#3c403b"
        keyword: { foreground: "#927c5dcc", fontStyle: bold underline }
`),
      );

      expect(theme.spec.dark?.editor?.tokens).toEqual({
        "": { background: "#191919" },
        comment: "#3c403b",
        keyword: { foreground: "#927c5dcc", fontStyle: "bold underline" },
      });
    });

    it("explains an unquoted color of an editor token", () => {
      const error = getError(
        minimal(`  dark:
    editor:
      tokens:
        comment: #3c403b
`),
      );

      expect(error).toContain("spec.dark.editor.tokens.comment: empty color");
      expect(error).toContain("has to be quoted");
    });

    it("explains an unquoted color in the style of an editor token", () => {
      const error = getError(
        minimal(`  dark:
    editor:
      tokens:
        keyword:
          foreground: #927c5d
          fontStyle: bold
`),
      );

      expect(error).toContain("spec.dark.editor.tokens.keyword.foreground: empty color");
      expect(error).toContain("has to be quoted");
    });

    it.each(["3c403b", "#abc", "red", "#3c403b8"])("refuses the token color %s", (color) => {
      expect(
        getError(
          minimal(`  dark:
    editor:
      tokens:
        comment: "${color}"
        keyword: { foreground: "${color}" }
`),
        ),
      ).toBe(
        "spec.dark.editor.tokens.comment: expected a hex color: #rrggbb or #rrggbbaa\n" +
          "spec.dark.editor.tokens.keyword.foreground: expected a hex color: #rrggbb or #rrggbbaa",
      );
    });

    it("refuses an editor token that is neither a color nor a style", () => {
      expect(
        getError(
          minimal(`  dark:
    editor:
      tokens:
        comment: 42
`),
        ),
      ).toBe(
        "spec.dark.editor.tokens.comment: expected a hex color, or an object with foreground, background and fontStyle",
      );
    });
  });

  describe("resolving a variant", () => {
    it("takes the missing tokens from the built-in theme in the same variant", () => {
      const theme = parseValid(
        minimal(`  dark:
    colors:
      primary: "#ff0000"
  light:
    colors:
      primary: "#00ff00"
`),
      );
      const dark = resolveThemeVariant(theme, "dark", defaultTheme);
      const light = resolveThemeVariant(theme, "light", defaultTheme);

      expect(dark.colors.primary).toBe("#ff0000");
      expect(dark.colors.mainBackground).toBe(defaultTheme.spec.dark?.colors?.mainBackground);
      expect(light.colors.primary).toBe("#00ff00");
      expect(light.colors.mainBackground).toBe(defaultTheme.spec.light?.colors?.mainBackground);
      expect(Object.keys(dark.colors).sort()).toEqual([...lensColorNames].sort());
    });

    it("leaves unknown tokens out", () => {
      const theme = parseValid(
        minimal(`  dark:
    colors:
      primaryy: "#ff0000"
`),
      );

      expect(resolveThemeVariant(theme, "dark", defaultTheme).colors).not.toHaveProperty("primaryy");
    });

    it("gives a theme with a single variant that variant whatever is requested", () => {
      const theme = parseValid(darkOnly);

      expect(getAvailableVariants(theme)).toEqual(["dark"]);
      expect(getEffectiveVariant(theme, "light")).toBe("dark");
      expect(resolveThemeVariant(theme, "light", defaultTheme)).toMatchObject({
        type: "dark",
        colors: { primary: "#ff0000", mainBackground: defaultTheme.spec.dark?.colors?.mainBackground },
      });
    });

    it("describes the theme as the extension API shows it", () => {
      const theme = parseValid(darkOnly);

      expect(resolveThemeVariant(theme, "dark", defaultTheme)).toMatchObject({
        name: "my-theme",
        type: "dark",
        description: "",
        author: "",
        monacoTheme: "freelens-theme-my-theme-dark",
      });
      expect(resolveThemeVariant(theme, "dark", defaultTheme).isDefault).toBeUndefined();
    });

    it("takes the editor theme from the built-in theme when the variant has none", () => {
      const theme = parseValid(darkOnly);
      const builtInEditor = defaultTheme.spec.dark?.editor;

      expect(resolveEditorTheme(theme, "dark", defaultTheme)).toEqual({
        base: builtInEditor?.base,
        inherit: builtInEditor?.inherit,
        colors: builtInEditor?.colors,
        tokens: builtInEditor?.tokens,
      });
    });

    it("takes the editor colors and tokens a variant leaves out from the built-in theme", () => {
      const theme = parseValid(
        minimal(`  dark:
    editor:
      colors:
        editor.background: "#000000"
      tokens:
        comment: { foreground: "#ff0000", fontStyle: italic }
        my.token: "#00ff00"
`),
      );
      const builtInEditor = defaultTheme.spec.dark?.editor;
      const editor = resolveEditorTheme(theme, "dark", defaultTheme);

      expect(editor.base).toBe("vs-dark");
      expect(editor.inherit).toBe(true);
      expect(editor.colors).toEqual({ ...builtInEditor?.colors, "editor.background": "#000000" });
      expect(editor.tokens).toEqual({
        ...builtInEditor?.tokens,
        comment: { foreground: "#ff0000", fontStyle: "italic" },
        "my.token": "#00ff00",
      });
      expect(editor.tokens.string).toBe("#5d90cd");
    });

    it("takes the editor base and inherit from the variant when it has them", () => {
      const theme = parseValid(
        minimal(`  light:
    editor:
      base: hc-black
      inherit: false
`),
      );

      expect(resolveEditorTheme(theme, "light", defaultTheme)).toMatchObject({ base: "hc-black", inherit: false });
      expect(resolveEditorTheme(defaultTheme, "light", defaultTheme)).toMatchObject({ base: "vs", inherit: true });
    });

    it("takes hc-light as the editor base", () => {
      const theme = parseValid(
        minimal(`  light:
    editor:
      base: hc-light
`),
      );

      expect(resolveEditorTheme(theme, "light", defaultTheme).base).toBe("hc-light");
    });
  });

  describe("the rules of an editor theme", () => {
    it("are the tokens in order, a color as the foreground, without #", () => {
      expect(
        getMonacoTokenRules({
          "": { background: "#191919" },
          comment: "#3c403b",
          keyword: { foreground: "#927C5DCC", background: "#000000", fontStyle: "bold" },
        }),
      ).toEqual([
        { token: "", background: "191919" },
        { token: "comment", foreground: "3c403b" },
        { token: "keyword", foreground: "927C5DCC", background: "000000", fontStyle: "bold" },
      ]);
    });

    it("are the rules of the built-in dark editor theme", () => {
      const rules = getMonacoTokenRules(resolveEditorTheme(defaultTheme, "dark", defaultTheme).tokens);

      expect(rules).toHaveLength(28);
      expect(rules[0]).toEqual({ token: "", background: "191919" });
      expect(rules).toContainEqual({ token: "comment", foreground: "3c403b" });
      expect(rules).toContainEqual({ token: "invalid", foreground: "ffffff", background: "e92e2e" });
      expect(rules[rules.length - 1]).toEqual({ token: "support.constant.property-value.css", foreground: "a165ac" });
    });

    it("are empty for the built-in light editor theme, which keeps the rules of its base", () => {
      expect(getMonacoTokenRules(resolveEditorTheme(defaultTheme, "light", defaultTheme).tokens)).toEqual([]);
    });
  });

  describe("the default theme", () => {
    it("is named freelens", () => {
      expect(defaultTheme.metadata.name).toBe(defaultThemeName);
    });

    it.each(["dark", "light"] as const)("defines every token in the %s variant", (variant) => {
      expect(Object.keys(defaultTheme.spec[variant]?.colors ?? {}).sort()).toEqual([...lensColorNames].sort());
      expect(defaultTheme.spec[variant]?.editor).toBeDefined();
    });

    it.each(["dark", "light"] as const)("knows every terminal token it sets in the %s variant", (variant) => {
      for (const token of Object.keys(defaultTheme.spec[variant]?.terminalColors ?? {})) {
        expect(terminalColorNames).toContain(token);
      }
    });

    it("is marked as the default in both variants", () => {
      expect(resolveThemeVariant(defaultTheme, "dark", defaultTheme).isDefault).toBe(true);
      expect(resolveThemeVariant(defaultTheme, "light", defaultTheme).isDefault).toBe(true);
    });

    it("passes the JSON Schema", () => {
      const validate = createValidator();

      expect(validate(yaml.load(defaultThemeSource))).toBe(true);
      expect(validate.errors ?? []).toEqual([]);
    });

    it("points at the JSON Schema", () => {
      expect(defaultThemeSource.split("\n")[0]).toBe(`# yaml-language-server: $schema=${themeSchemaUrl}`);
    });
  });

  describe("the built-in themes", () => {
    const builtInThemeNames = builtInThemes.map(({ theme }) => theme.metadata.name);
    const otherThemes = builtInThemes.filter(({ theme }) => theme.metadata.name !== defaultThemeName);
    const sourceOf = (name: string) => builtInThemes.find(({ theme }) => theme.metadata.name === name)?.source ?? "";

    it("are freelens, the default, then Ayu, Ayu Mirage, Dracula, Graphite, Catppuccin, Solarized and High Contrast", () => {
      expect(builtInThemeNames).toEqual([
        "freelens",
        "ayu",
        "ayu-mirage",
        "dracula",
        "graphite",
        "catppuccin",
        "solarized",
        "high-contrast",
      ]);
      expect(builtInThemes[0].theme).toBe(defaultTheme);
    });

    it("are found by name, and reserve their names", () => {
      for (const name of builtInThemeNames) {
        expect(findBuiltInTheme(name)?.metadata.name).toBe(name);
        expect(isBuiltInThemeName(name)).toBe(true);
      }

      expect(findBuiltInTheme("my-theme")).toBeUndefined();
      expect(isBuiltInThemeName("my-theme")).toBe(false);
    });

    describe.each(builtInThemes.map(({ theme, source }) => [theme.metadata.name, theme, source] as const))(
      "%s",
      (_name, theme, source) => {
        it("passes the JSON Schema", () => {
          const validate = createValidator();

          expect(validate(yaml.load(source))).toBe(true);
          expect(validate.errors ?? []).toEqual([]);
        });

        it("points at the JSON Schema", () => {
          expect(source.split("\n")[0]).toBe(`# yaml-language-server: $schema=${themeSchemaUrl}`);
        });

        it("has both variants, without unknown tokens", () => {
          expect(getAvailableVariants(theme)).toEqual(["dark", "light"]);
          expect(parseThemeFile(source)).toMatchObject({ isValid: true, unknownTokens: [] });
        });
      },
    );

    describe.each(otherThemes.map(({ theme }) => [theme.metadata.name, theme] as const))("%s", (_name, theme) => {
      it.each(["dark", "light"] as const)("sets every token the default theme sets in the %s variant", (variant) => {
        const spec = theme.spec[variant];

        expect(Object.keys(spec?.colors ?? {}).sort()).toEqual([...lensColorNames].sort());
        expect(Object.keys(spec?.terminalColors ?? {}).sort()).toEqual(
          Object.keys(defaultTheme.spec[variant]?.terminalColors ?? {}).sort(),
        );
        expect(spec?.editor?.base).toBeDefined();
        expect(Object.keys(spec?.editor?.tokens ?? {})).not.toEqual([]);
      });

      it.each(["dark", "light"] as const)("resolves the %s variant to its own colors", (variant) => {
        const resolved = resolveThemeVariant(theme, variant, defaultTheme);

        expect(resolved).toMatchObject({ name: theme.metadata.name, type: variant });
        expect(resolved.isDefault).toBeUndefined();
        expect(resolved.colors).toEqual(theme.spec[variant]?.colors);
        expect(resolved.terminalColors).toEqual(theme.spec[variant]?.terminalColors);
      });

      it.each(["dark", "light"] as const)(
        "keeps the text on its accent at the WCAG AA contrast in the %s variant",
        (variant) => {
          const colors = resolveThemeVariant(theme, variant, defaultTheme).colors;
          const textOnAccent = [colors.textColorOnPrimary, colors.sidebarActiveColor, colors.drawerTitleText];
          const accentBackgrounds = [
            colors.primary,
            colors.blue,
            colors.buttonPrimaryBackground,
            colors.menuActiveBackground,
          ];

          const belowAA = textOnAccent.flatMap((text) =>
            accentBackgrounds
              .map((background) => ({ text, background, ratio: getContrastRatio(text, background) ?? 0 }))
              .filter(({ ratio }) => ratio < 4.5),
          );

          expect(belowAA).toEqual([]);
        },
      );
    });

    it.each(["ayu", "ayu-mirage"])("%s credits Ayu and keeps its MIT notice", (name) => {
      const source = sourceOf(name);

      expect(findBuiltInTheme(name)?.spec.description).toContain("Ayu");
      expect(source).toContain("https://github.com/ayu-theme/ayu-colors");
      expect(source).toContain("https://github.com/ayu-theme/vscode-ayu");
      expect(source).toContain("Copyright (c) Konstantin Pschera");
      expect(source).toContain("Copyright (c) 2016 Ike Kurghinyan");
      expect(source).toContain("Permission is hereby granted, free of charge");
    });

    it("dracula credits Dracula and keeps its MIT notice", () => {
      const source = sourceOf("dracula");

      expect(findBuiltInTheme("dracula")?.spec.description).toContain("Dracula");
      expect(source).toContain("https://draculatheme.com");
      expect(source).toContain("Copyright (c) 2023 Dracula Theme");
      expect(source).toContain("Permission is hereby granted, free of charge");
    });

    it("dracula takes Dracula's own purple as the accent in both variants", () => {
      const dracula = findBuiltInTheme("dracula");

      expect(dracula?.spec.dark?.colors).toMatchObject({ primary: "#bd93f9", textColorOnPrimary: "#282a36" });
      expect(dracula?.spec.light?.colors).toMatchObject({ primary: "#644ac9", textColorOnPrimary: "#ffffff" });
    });

    it("graphite credits Graphite and Tilman Griesel and keeps its MIT notice", () => {
      const source = sourceOf("graphite");
      const description = findBuiltInTheme("graphite")?.spec.description;

      expect(description).toContain("Graphite");
      expect(description).toContain("Tilman Griesel");
      expect(source).toContain("https://graphite.rocketengine.io/");
      expect(source).toContain("https://github.com/TilmanGriesel/graphite");
      expect(source).toContain("Copyright (c) 2022 Tilman Griesel");
      expect(source).toContain("Permission is hereby granted, free of charge");
    });

    it("graphite takes Graphite's own orange as the accent in both variants", () => {
      const graphite = findBuiltInTheme("graphite");

      expect(graphite?.spec.dark?.colors).toMatchObject({ primary: "#e08a00", textColorOnPrimary: "#101215" });
      expect(graphite?.spec.light?.colors).toMatchObject({ primary: "#ee9300", textColorOnPrimary: "#131536" });
    });

    it.each(["dark", "light"] as const)(
      "graphite keeps its status colors at the WCAG AA contrast on its surfaces in the %s variant",
      (variant) => {
        const graphite = findBuiltInTheme("graphite");

        expect(graphite).toBeDefined();

        const colors = resolveThemeVariant(graphite ?? defaultTheme, variant, defaultTheme).colors;
        const statusColors = [
          colors.colorSuccess,
          colors.colorOk,
          colors.colorInfo,
          colors.colorError,
          colors.colorSoftError,
          colors.colorWarning,
        ];
        const surfaces = [colors.mainBackground, colors.contentColor, colors.dialogBackground];

        const belowAA = statusColors.flatMap((text) =>
          surfaces
            .map((background) => ({ text, background, ratio: getContrastRatio(text, background) ?? 0 }))
            .filter(({ ratio }) => ratio < 4.5),
        );

        expect(belowAA).toEqual([]);
      },
    );

    it("catppuccin credits Catppuccin and keeps its MIT notice", () => {
      const source = sourceOf("catppuccin");

      expect(findBuiltInTheme("catppuccin")?.spec.description).toContain("Catppuccin");
      expect(source).toContain("https://catppuccin.com");
      expect(source).toContain("https://github.com/catppuccin/palette");
      expect(source).toContain("https://github.com/catppuccin/vscode");
      expect(source).toContain("Copyright (c) 2021 Catppuccin");
      expect(source).toContain("Permission is hereby granted, free of charge");
    });

    it("catppuccin takes Catppuccin's own Mauve as the accent in both variants", () => {
      const catppuccin = findBuiltInTheme("catppuccin");

      expect(catppuccin?.spec.dark?.colors).toMatchObject({ primary: "#cba6f7", textColorOnPrimary: "#11111b" });
      expect(catppuccin?.spec.light?.colors).toMatchObject({ primary: "#8839ef", textColorOnPrimary: "#eff1f5" });
    });

    it.each(["dark", "light"] as const)(
      "catppuccin keeps its status colors at the WCAG AA contrast on its surfaces in the %s variant",
      (variant) => {
        const catppuccin = findBuiltInTheme("catppuccin");

        expect(catppuccin).toBeDefined();

        const colors = resolveThemeVariant(catppuccin ?? defaultTheme, variant, defaultTheme).colors;
        const statusColors = [
          colors.colorSuccess,
          colors.colorOk,
          colors.colorInfo,
          colors.colorError,
          colors.colorSoftError,
          colors.colorWarning,
        ];
        const surfaces = [colors.mainBackground, colors.contentColor, colors.dialogBackground];

        const belowAA = statusColors.flatMap((text) =>
          surfaces
            .map((background) => ({ text, background, ratio: getContrastRatio(text, background) ?? 0 }))
            .filter(({ ratio }) => ratio < 4.5),
        );

        expect(belowAA).toEqual([]);
      },
    );

    it("solarized credits Solarized and Ethan Schoonover and keeps its MIT notice", () => {
      const source = sourceOf("solarized");
      const description = findBuiltInTheme("solarized")?.spec.description;

      expect(description).toContain("Solarized");
      expect(description).toContain("Ethan Schoonover");
      expect(source).toContain("https://ethanschoonover.com/solarized/");
      expect(source).toContain("https://github.com/altercation/solarized");
      expect(source).toContain("Copyright (c) 2011 Ethan Schoonover");
      expect(source).toContain("Permission is hereby granted, free of charge");
    });

    it("solarized takes Solarized blue as the accent in both variants", () => {
      const solarized = findBuiltInTheme("solarized");

      expect(solarized?.spec.dark?.colors).toMatchObject({ primary: "#268bd2", textColorOnPrimary: "#00222b" });
      expect(solarized?.spec.light?.colors).toMatchObject({ primary: "#268bd2", textColorOnPrimary: "#00222b" });
    });

    it("solarized swaps the base colors between its variants", () => {
      const solarized = findBuiltInTheme("solarized");

      expect(solarized?.spec.dark?.colors).toMatchObject({ mainBackground: "#002b36", textColorPrimary: "#839496" });
      expect(solarized?.spec.light?.colors).toMatchObject({ mainBackground: "#fdf6e3" });
      expect(solarized?.spec.dark?.terminalColors).toMatchObject({ background: "#002b36", black: "#073642" });
      expect(solarized?.spec.light?.terminalColors).toMatchObject({ background: "#fdf6e3", black: "#073642" });
    });

    it.each(["dark", "light"] as const)(
      "solarized keeps its text and status colors at the WCAG AA contrast on its background in the %s variant",
      (variant) => {
        const solarized = findBuiltInTheme("solarized");

        expect(solarized).toBeDefined();

        const colors = resolveThemeVariant(solarized ?? defaultTheme, variant, defaultTheme).colors;
        const textColors = [
          colors.textColorPrimary,
          colors.textColorSecondary,
          colors.textColorTertiary,
          colors.textColorAccent,
          colors.dialogTextColor,
          colors.settingsColor,
          colors.logsForeground,
          colors.drawerItemNameColor,
          colors.drawerItemValueColor,
          colors.colorSuccess,
          colors.colorOk,
          colors.colorInfo,
          colors.colorError,
          colors.colorSoftError,
          colors.colorWarning,
        ];
        const surfaces = [colors.mainBackground, colors.contentColor, colors.dialogBackground];

        const belowAA = textColors.flatMap((text) =>
          surfaces
            .map((background) => ({ text, background, ratio: getContrastRatio(text, background) ?? 0 }))
            .filter(({ ratio }) => ratio < 4.5),
        );

        expect(belowAA).toEqual([]);
      },
    );

    describe("high-contrast", () => {
      // A color that is missing, not opaque, or not a color, has no ratio and fails.
      const findRatiosBelow = (
        minimum: number,
        foregrounds: (string | undefined)[],
        backgrounds: (string | undefined)[],
      ) =>
        [...new Set(foregrounds.map((color) => color ?? ""))].flatMap((foreground) =>
          [...new Set(backgrounds.map((color) => color ?? ""))]
            .map((background) => ({ foreground, background, ratio: getContrastRatio(foreground, background) ?? 0 }))
            .filter(({ ratio }) => ratio < minimum),
        );

      const resolveHighContrast = (variant: "dark" | "light") => {
        const highContrast = findBuiltInTheme("high-contrast");

        expect(highContrast).toBeDefined();

        return {
          colors: resolveThemeVariant(highContrast ?? defaultTheme, variant, defaultTheme).colors,
          terminalColors: resolveThemeVariant(highContrast ?? defaultTheme, variant, defaultTheme).terminalColors,
          editor: resolveEditorTheme(highContrast ?? defaultTheme, variant, defaultTheme),
        };
      };

      it("is a design of Freelens, without the notice of another theme", () => {
        const source = sourceOf("high-contrast");

        expect(findBuiltInTheme("high-contrast")?.spec).toMatchObject({
          displayName: "High Contrast",
          author: "Freelens Authors",
        });
        expect(source).not.toContain("Permission is hereby granted");
      });

      it("takes a cyan accent in the dark variant and a deep blue in the light one", () => {
        const highContrast = findBuiltInTheme("high-contrast");

        expect(highContrast?.spec.dark?.colors).toMatchObject({ primary: "#00e5ff", textColorOnPrimary: "#000000" });
        expect(highContrast?.spec.light?.colors).toMatchObject({ primary: "#0037a6", textColorOnPrimary: "#ffffff" });
      });

      it("extends Monaco's high contrast editor themes", () => {
        expect(resolveHighContrast("dark").editor.base).toBe("hc-black");
        expect(resolveHighContrast("light").editor.base).toBe("hc-light");
      });

      describe.each(["dark", "light"] as const)("in the %s variant", (variant) => {
        const { colors, terminalColors, editor } = resolveHighContrast(variant);

        const surfaces = [
          colors.mainBackground,
          colors.secondaryBackground,
          colors.contentColor,
          colors.layoutBackground,
          colors.layoutTabsBackground,
          colors.sidebarBackground,
          colors.sidebarLogoBackground,
          colors.sidebarItemHoverBackground,
          colors.tableBgcStripe,
          colors.tableBgcSelected,
          colors.tableHeaderBackground,
          colors.helmDescriptionBlockquoteBackground,
          colors.helmDescriptionTrBackground,
          colors.helmDescriptionCodeBackground,
          colors.helmDescriptionPreBackground,
          colors.dockHeadBackground,
          colors.dockInfoBackground,
          colors.dockEditorBackground,
          colors.dockEditorActiveLineBackground,
          colors.dockBadgeBackground,
          colors.dockTabActiveBackground,
          colors.logsBackground,
          colors.logRowHoverBackground,
          colors.dialogBackground,
          colors.dialogFooterBackground,
          colors.drawerTogglerBackground,
          colors.drawerSubtitleBackground,
          colors.clusterMenuBackground,
          colors.clusterMenuCellBackground,
          colors.clusterSettingsBackground,
          colors.filterAreaBackground,
          colors.inputControlBackground,
          colors.radioActiveBackground,
          colors.menuSelectedOptionBgc,
          colors.canvasBackground,
          colors.settingsBackground,
          colors.navSelectedBackground,
          colors.tooltipBackground,
        ];

        it("has two surfaces at most, a background and a single step", () => {
          expect(new Set(surfaces).size).toBeLessThanOrEqual(2);
        });

        it("keeps every text color at the WCAG AAA contrast, 7:1, on every surface", () => {
          const textColors = [
            colors.primary,
            colors.blue,
            colors.magenta,
            colors.golden,
            colors.textColorPrimary,
            colors.textColorSecondary,
            colors.textColorTertiary,
            colors.textColorAccent,
            colors.textColorDimmed,
            colors.layoutTabsActiveColor,
            colors.sidebarSubmenuActiveColor,
            colors.tableHeaderColor,
            colors.tableSelectedRowColor,
            colors.helmStableRepo,
            colors.helmIncubatorRepo,
            colors.helmDescriptionBlockquoteColor,
            colors.helmDescriptionHeaders,
            colors.helmDescriptionH6,
            colors.helmDescriptionPreColor,
            colors.colorSuccess,
            colors.colorOk,
            colors.colorInfo,
            colors.colorError,
            colors.colorSoftError,
            colors.colorWarning,
            colors.colorTerminated,
            colors.dockEditorTag,
            colors.dockEditorKeyword,
            colors.dockEditorComment,
            colors.logsForeground,
            colors.dialogTextColor,
            colors.drawerItemNameColor,
            colors.drawerItemValueColor,
            colors.iconActiveColor,
            colors.inputOptionHoverColor,
            colors.settingsColor,
            colors.navHoverColor,
          ];

          expect(findRatiosBelow(7, textColors, surfaces)).toEqual([]);
        });

        it("keeps the placeholders at 4.5:1 on every surface", () => {
          expect(findRatiosBelow(4.5, [colors.halfGray], surfaces)).toEqual([]);
        });

        it("keeps the text on the accent at 7:1", () => {
          const textOnAccent = [colors.textColorOnPrimary, colors.sidebarActiveColor, colors.drawerTitleText];
          const accentBackgrounds = [
            colors.primary,
            colors.blue,
            colors.buttonPrimaryBackground,
            colors.menuActiveBackground,
          ];

          expect(findRatiosBelow(7, textOnAccent, accentBackgrounds)).toEqual([]);
        });

        it("keeps the text of buttons and dialog headers at 7:1, and of disabled buttons at 4.5:1", () => {
          // Default and accent buttons and the header of dialogs draw white text, light buttons #505050.
          const whiteText = [
            colors.buttonDefaultBackground,
            colors.buttonAccentBackground,
            colors.dialogHeaderBackground,
          ];

          expect(findRatiosBelow(7, ["#ffffff"], whiteText)).toEqual([]);
          expect(findRatiosBelow(7, ["#505050"], [colors.buttonLightBackground])).toEqual([]);
          expect(findRatiosBelow(7, [colors.textColorSecondary], [colors.colorVague])).toEqual([]);
          expect(findRatiosBelow(4.5, ["#ffffff"], [colors.buttonDisabledBackground])).toEqual([]);
        });

        it("keeps every border, separator and the accent at 3:1 on every surface", () => {
          const borders = [
            colors.primary,
            colors.borderColor,
            colors.borderFaintColor,
            colors.halfGray,
            colors.layoutTabsLineColor,
            colors.helmDescriptionHr,
            colors.helmDescriptionBlockquoteBorder,
            colors.helmDescriptionTdBorder,
            colors.dockInfoBorderColor,
            colors.dockTabBorderColor,
            colors.clusterMenuBorderColor,
            colors.clusterMenuCellOutline,
            colors.inputControlBorder,
            colors.inputControlHoverBorder,
            colors.hrColor,
            colors.scrollBarColor,
            colors.chartCapacityColor,
            colors.pieChartDefaultColor,
          ];

          expect(findRatiosBelow(3, borders, surfaces)).toEqual([]);
        });

        it("keeps every ANSI color, the bright ones included, at 7:1 on the terminal background", () => {
          const { background, cursor, cursorAccent } = terminalColors;
          const ansiColors = [
            terminalColors.foreground,
            terminalColors.black,
            terminalColors.red,
            terminalColors.green,
            terminalColors.yellow,
            terminalColors.blue,
            terminalColors.magenta,
            terminalColors.cyan,
            terminalColors.white,
            terminalColors.brightBlack,
            terminalColors.brightRed,
            terminalColors.brightGreen,
            terminalColors.brightYellow,
            terminalColors.brightBlue,
            terminalColors.brightMagenta,
            terminalColors.brightCyan,
            terminalColors.brightWhite,
          ];

          expect(findRatiosBelow(7, ansiColors, [background])).toEqual([]);
          expect(findRatiosBelow(7, [cursor], [background])).toEqual([]);
          expect(findRatiosBelow(7, [cursorAccent], [cursor])).toEqual([]);
        });

        it("keeps every editor token and the line numbers at 7:1 on the background and the highlighted line", () => {
          const backgrounds = [editor.colors["editor.background"], editor.colors["editor.lineHighlightBackground"]];
          const tokenColors = Object.values(editor.tokens).map((value) =>
            typeof value === "string" ? value : (value.foreground ?? ""),
          );

          expect(
            findRatiosBelow(
              7,
              [
                editor.colors["editor.foreground"],
                editor.colors["editorLineNumber.foreground"],
                editor.colors["editorLineNumber.activeForeground"],
                ...tokenColors,
              ],
              backgrounds,
            ),
          ).toEqual([]);
        });
      });
    });

    it("share the same Ayu Light variant", () => {
      expect(findBuiltInTheme("ayu-mirage")?.spec.light).toEqual(findBuiltInTheme("ayu")?.spec.light);
    });
  });

  describe("the JSON Schema", () => {
    it("is the committed schemas/theme-v1.schema.json", async () => {
      await expect(`${formatJson(getThemeFileJsonSchema())}\n`).toMatchFileSnapshot(
        "../../../../../../../../schemas/theme-v1.schema.json",
      );
    });

    it("rejects unknown tokens, which the application only reports", () => {
      const validate = createValidator();
      const theme = yaml.load(
        minimal(`  dark:
    colors:
      primaryy: "#ff0000"
`),
      );

      expect(validate(theme)).toBe(false);
    });

    it("rejects a theme without any variant", () => {
      expect(createValidator()(yaml.load(minimal("")))).toBe(false);
    });

    it("rejects an empty color", () => {
      const theme = yaml.load(
        minimal(`  dark:
    colors:
      primary: #ff0000
`),
      );

      expect(createValidator()(theme)).toBe(false);
    });

    it("rejects a wrong apiVersion", () => {
      expect(createValidator()(yaml.load(darkOnly.replace("freelens.app/v1", "freelens.app/v2")))).toBe(false);
    });

    it("accepts a JSON theme with a $schema field", () => {
      expect(createValidator()({ $schema: themeSchemaUrl, ...(yaml.load(darkOnly) as object) })).toBe(true);
    });

    it("accepts editor tokens as a color or as a style, and an editor without a base", () => {
      const theme = yaml.load(
        minimal(`  dark:
    editor:
      tokens:
        "": { background: "#191919" }
        comment: "#3c403b"
        keyword: { foreground: "#927c5d", fontStyle: bold }
`),
      );

      expect(createValidator()(theme)).toBe(true);
    });

    it.each([
      ["an unquoted color", "comment: #3c403b"],
      ["a color without #", 'comment: "3c403b"'],
      ["a short color", 'comment: "#abc"'],
      ["an unknown field of a style", 'keyword: { foregroud: "#927c5d" }'],
      ["a list of rules", '- { token: comment, foreground: "#3c403b" }'],
    ])("rejects an editor token with %s", (_, token) => {
      const theme = yaml.load(
        minimal(`  dark:
    editor:
      tokens:
        ${token}
`),
      );

      expect(createValidator()(theme)).toBe(false);
    });
  });

  describe("export", () => {
    it("gives a file that imports back unchanged", () => {
      const exported = serializeThemeFile(defaultTheme);

      expect(parseValid(exported)).toEqual(defaultTheme);
    });

    it("carries the modeline and quotes every color", () => {
      const exported = serializeThemeFile(defaultTheme);

      expect(exported.split("\n")[0]).toBe(`# yaml-language-server: $schema=${themeSchemaUrl}`);
      expect(exported).not.toMatch(/: #/);
      expect(createValidator()(yaml.load(exported))).toBe(true);
    });

    it("writes the editor tokens as a map of colors and styles", () => {
      const exported = serializeThemeFile(defaultTheme);

      expect(exported).toContain(
        '      tokens:\n        "":\n          background: "#191919"\n        comment: "#3c403b"\n',
      );
      expect(exported).toContain(
        '        invalid:\n          foreground: "#ffffff"\n          background: "#e92e2e"\n',
      );
      expect(exported).not.toContain("rules");
    });
  });
});
