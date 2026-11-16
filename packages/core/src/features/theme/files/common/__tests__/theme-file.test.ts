/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Ajv2020 from "ajv/dist/2020";
import * as yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { builtInTheme, builtInThemeName, builtInThemeSource } from "../builtin-theme";
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
      const dark = resolveThemeVariant(theme, "dark", builtInTheme);
      const light = resolveThemeVariant(theme, "light", builtInTheme);

      expect(dark.colors.primary).toBe("#ff0000");
      expect(dark.colors.mainBackground).toBe(builtInTheme.spec.dark?.colors?.mainBackground);
      expect(light.colors.primary).toBe("#00ff00");
      expect(light.colors.mainBackground).toBe(builtInTheme.spec.light?.colors?.mainBackground);
      expect(Object.keys(dark.colors).sort()).toEqual([...lensColorNames].sort());
    });

    it("leaves unknown tokens out", () => {
      const theme = parseValid(
        minimal(`  dark:
    colors:
      primaryy: "#ff0000"
`),
      );

      expect(resolveThemeVariant(theme, "dark", builtInTheme).colors).not.toHaveProperty("primaryy");
    });

    it("gives a theme with a single variant that variant whatever is requested", () => {
      const theme = parseValid(darkOnly);

      expect(getAvailableVariants(theme)).toEqual(["dark"]);
      expect(getEffectiveVariant(theme, "light")).toBe("dark");
      expect(resolveThemeVariant(theme, "light", builtInTheme)).toMatchObject({
        type: "dark",
        colors: { primary: "#ff0000", mainBackground: builtInTheme.spec.dark?.colors?.mainBackground },
      });
    });

    it("describes the theme as the extension API shows it", () => {
      const theme = parseValid(darkOnly);

      expect(resolveThemeVariant(theme, "dark", builtInTheme)).toMatchObject({
        name: "my-theme",
        type: "dark",
        description: "",
        author: "",
        monacoTheme: "freelens-theme-my-theme-dark",
      });
      expect(resolveThemeVariant(theme, "dark", builtInTheme).isDefault).toBeUndefined();
    });

    it("takes the editor theme from the built-in theme when the variant has none", () => {
      const theme = parseValid(darkOnly);
      const builtInEditor = builtInTheme.spec.dark?.editor;

      expect(resolveEditorTheme(theme, "dark", builtInTheme)).toEqual({
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
      const builtInEditor = builtInTheme.spec.dark?.editor;
      const editor = resolveEditorTheme(theme, "dark", builtInTheme);

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

      expect(resolveEditorTheme(theme, "light", builtInTheme)).toMatchObject({ base: "hc-black", inherit: false });
      expect(resolveEditorTheme(builtInTheme, "light", builtInTheme)).toMatchObject({ base: "vs", inherit: true });
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
      const rules = getMonacoTokenRules(resolveEditorTheme(builtInTheme, "dark", builtInTheme).tokens);

      expect(rules).toHaveLength(28);
      expect(rules[0]).toEqual({ token: "", background: "191919" });
      expect(rules).toContainEqual({ token: "comment", foreground: "3c403b" });
      expect(rules).toContainEqual({ token: "invalid", foreground: "ffffff", background: "e92e2e" });
      expect(rules[rules.length - 1]).toEqual({ token: "support.constant.property-value.css", foreground: "a165ac" });
    });

    it("are empty for the built-in light editor theme, which keeps the rules of its base", () => {
      expect(getMonacoTokenRules(resolveEditorTheme(builtInTheme, "light", builtInTheme).tokens)).toEqual([]);
    });
  });

  describe("the built-in theme", () => {
    it("is named freelens", () => {
      expect(builtInTheme.metadata.name).toBe(builtInThemeName);
    });

    it.each(["dark", "light"] as const)("defines every token in the %s variant", (variant) => {
      expect(Object.keys(builtInTheme.spec[variant]?.colors ?? {}).sort()).toEqual([...lensColorNames].sort());
      expect(builtInTheme.spec[variant]?.editor).toBeDefined();
    });

    it.each(["dark", "light"] as const)("knows every terminal token it sets in the %s variant", (variant) => {
      for (const token of Object.keys(builtInTheme.spec[variant]?.terminalColors ?? {})) {
        expect(terminalColorNames).toContain(token);
      }
    });

    it("is marked as the default in both variants", () => {
      expect(resolveThemeVariant(builtInTheme, "dark", builtInTheme).isDefault).toBe(true);
      expect(resolveThemeVariant(builtInTheme, "light", builtInTheme).isDefault).toBe(true);
    });

    it("passes the JSON Schema", () => {
      const validate = createValidator();

      expect(validate(yaml.load(builtInThemeSource))).toBe(true);
      expect(validate.errors ?? []).toEqual([]);
    });

    it("points at the JSON Schema", () => {
      expect(builtInThemeSource.split("\n")[0]).toBe(`# yaml-language-server: $schema=${themeSchemaUrl}`);
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
      const exported = serializeThemeFile(builtInTheme);

      expect(parseValid(exported)).toEqual(builtInTheme);
    });

    it("carries the modeline and quotes every color", () => {
      const exported = serializeThemeFile(builtInTheme);

      expect(exported.split("\n")[0]).toBe(`# yaml-language-server: $schema=${themeSchemaUrl}`);
      expect(exported).not.toMatch(/: #/);
      expect(createValidator()(yaml.load(exported))).toBe(true);
    });

    it("writes the editor tokens as a map of colors and styles", () => {
      const exported = serializeThemeFile(builtInTheme);

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
