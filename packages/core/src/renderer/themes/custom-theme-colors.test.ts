/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { mergeCustomThemeColors, toColorInputValue } from "./custom-theme-colors";

import type { LensTheme } from "./lens-theme";

describe("custom theme colors", () => {
  const baseTheme: LensTheme = {
    name: "Test",
    type: "dark",
    description: "Test theme",
    author: "Freelens",
    monacoTheme: "vs-dark",
    colors: {
      primary: "#00a7a0",
      buttonPrimaryBackground: "#00a7a0",
      menuActiveBackground: "#00a7a0",
      sidebarSubmenuActiveColor: "#ffffff",
    } as LensTheme["colors"],
    terminalColors: {},
  };

  it("applies valid custom color overrides", () => {
    const colors = mergeCustomThemeColors(baseTheme, {
      primary: "#ff00aa",
      buttonPrimaryBackground: "#112233",
    });

    expect(colors.primary).toBe("#ff00aa");
    expect(colors.buttonPrimaryBackground).toBe("#112233");
    expect(colors.menuActiveBackground).toBe("#00a7a0");
  });

  it("ignores unknown color names and invalid color values", () => {
    const colors = mergeCustomThemeColors(baseTheme, {
      primary: "red",
      notAThemeColor: "#abcdef",
    });

    expect(colors.primary).toBe("#00a7a0");
    expect(colors).not.toHaveProperty("notAThemeColor");
  });

  it("normalizes theme color values for color inputs", () => {
    expect(toColorInputValue("#abc")).toBe("#aabbcc");
    expect(toColorInputValue("#abcdef80")).toBe("#abcdef");
    expect(toColorInputValue("#123456")).toBe("#123456");
    expect(toColorInputValue("currentColor")).toBe("#000000");
  });
});
