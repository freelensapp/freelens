/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import lensDarkThemeInjectable from "../lens-dark.injectable";
import { accentColorNames, readableTextOn, relativeLuminance, withAccentColor, withAlpha } from "./create-theme";
import { resolveCustomTheme, toCustomThemeDefinition, unknownTokensOf } from "./custom-themes";
import { proLensThemes, systemThemeNames } from "./palettes";

import type { LensTheme } from "../lens-theme";

// The classic theme lists every token by hand, so it is the reference for
// which tokens a theme must define.
const classicDark = (lensDarkThemeInjectable as unknown as { instantiate: () => LensTheme }).instantiate();
const requiredTokens = Object.keys(classicDark.colors).sort();
const themes = Object.values(proLensThemes);

describe("ProLens built-in themes", () => {
  it("provides the seven named themes", () => {
    expect(themes.map((theme) => theme.name)).toEqual([
      "ProLens Dark",
      "ProLens Light",
      "Midnight",
      "Graphite",
      "Nord",
      "Aurora",
      "High Contrast",
    ]);
  });

  it.each(themes.map((theme) => [theme.name, theme] as const))("%s defines every colour token", (_name, theme) => {
    expect(Object.keys(theme.colors).sort()).toEqual(requiredTokens);

    for (const value of Object.values(theme.colors)) {
      expect(value).toMatch(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
    }
  });

  it("declares ProLens Dark as the only default", () => {
    expect(themes.filter((theme) => theme.isDefault).map((theme) => theme.name)).toEqual(["ProLens Dark"]);
    expect(classicDark.isDefault).toBeUndefined();
  });

  it("syncs with the computer between ProLens Dark and ProLens Light", () => {
    expect(proLensThemes.proLensDark.type).toBe("dark");
    expect(proLensThemes.proLensLight.type).toBe("light");
    expect(systemThemeNames).toEqual({ dark: "ProLens Dark", light: "ProLens Light" });
  });

  it("uses the high contrast editor theme for High Contrast", () => {
    expect(proLensThemes.highContrast.monacoTheme).toBe("hc-black");
  });

  it("keeps primary text readable on the main background of every theme", () => {
    for (const theme of themes) {
      const text = relativeLuminance(theme.colors.textColorPrimary);
      const background = relativeLuminance(theme.colors.mainBackground);
      const contrast = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);

      expect(contrast, theme.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("colour helpers", () => {
  it("adds an alpha channel", () => {
    expect(withAlpha("#123456", 0.5)).toBe("#12345680");
    expect(withAlpha("#abc", 1)).toBe("#aabbccff");
  });

  it("picks readable text", () => {
    expect(readableTextOn("#ffffff")).toBe("#0b0d12");
    expect(readableTextOn("#000000")).toBe("#ffffff");
  });
});

describe("accent colour override", () => {
  it("replaces exactly the accent tokens and the cursor", () => {
    const theme = proLensThemes.nord;
    const result = withAccentColor(theme, "#ff0000");

    for (const name of accentColorNames) {
      expect(result.colors[name]).toBe("#ff0000");
    }

    expect(result.colors.mainBackground).toBe(theme.colors.mainBackground);
    expect(result.terminalColors.cursor).toBe("#ff0000");
  });

  it("returns the theme unchanged without an override", () => {
    expect(withAccentColor(proLensThemes.nord, undefined)).toBe(proLensThemes.nord);
  });
});

describe("custom themes", () => {
  const builtIns = new Map(themes.map((theme) => [theme.name, theme]));

  it("extends the named theme and overrides known tokens only", () => {
    const theme = resolveCustomTheme(
      {
        name: "Mine",
        type: "dark",
        extends: "Nord",
        colors: { mainBackground: "#000001", notAToken: "#123456" },
        terminalColors: { red: "#ff0001" },
      },
      builtIns,
    );

    expect(theme?.colors.mainBackground).toBe("#000001");
    expect(theme?.colors.primary).toBe(proLensThemes.nord.colors.primary);
    expect(theme?.colors).not.toHaveProperty("notAToken");
    expect(theme?.terminalColors.red).toBe("#ff0001");
  });

  it("starts from the ProLens theme of its type when it extends nothing", () => {
    const theme = resolveCustomTheme({ name: "Bright", type: "light" }, builtIns);

    expect(theme?.colors).toEqual(proLensThemes.proLensLight.colors);
    expect(theme?.monacoTheme).toBe("vs");
  });

  it("never replaces a built-in theme", () => {
    expect(resolveCustomTheme({ name: "Nord", type: "dark" }, builtIns)).toBeUndefined();
  });

  it("reports unknown tokens", () => {
    expect(
      unknownTokensOf(
        { name: "x", type: "dark", colors: { primary: "#fff", primaryy: "#fff" }, terminalColors: { pink: "#fff" } },
        proLensThemes.proLensDark,
      ),
    ).toEqual(["primaryy", "terminalColors.pink"]);
  });

  it("exports a theme that resolves back to the same colours", () => {
    const definition = toCustomThemeDefinition(proLensThemes.aurora, "Aurora copy");
    const resolved = resolveCustomTheme(definition, builtIns);

    expect(resolved?.colors).toEqual(proLensThemes.aurora.colors);
    expect(resolved?.terminalColors).toEqual(proLensThemes.aurora.terminalColors);
  });
});
