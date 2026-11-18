/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { migrateLegacyThemePreferences } from "./migrate-legacy-theme-preferences";

describe("migrating the theme preferences of an earlier version", () => {
  it.each([
    ["system", "system"],
    ["Dark", "dark"],
    ["Light", "light"],
    ["unknown", "dark"],
  ] as const)("turns colorTheme %j into the %s variant of the built-in theme", (colorTheme, themeVariant) => {
    expect(migrateLegacyThemePreferences({ colorTheme })).toEqual({ theme: "freelens", themeVariant });
  });

  it("leaves preferences without colorTheme alone", () => {
    expect(migrateLegacyThemePreferences({ persistentSearch: true })).toEqual({ persistentSearch: true });
  });

  it("drops colorTheme next to a theme of this version", () => {
    expect(migrateLegacyThemePreferences({ colorTheme: "Light", theme: "mine" })).toEqual({ theme: "mine" });
  });

  it.each([
    ["Dark", "dark"],
    ["Light", "light"],
  ] as const)("turns terminalTheme %j into the %s variant of the built-in theme", (terminalTheme, variant) => {
    expect(migrateLegacyThemePreferences({ terminalTheme })).toEqual({
      terminalTheme: "freelens",
      terminalThemeVariant: variant,
    });
  });

  it("keeps a terminal theme of this version", () => {
    expect(migrateLegacyThemePreferences({ terminalTheme: "mine", terminalThemeVariant: "light" })).toEqual({
      terminalTheme: "mine",
      terminalThemeVariant: "light",
    });
  });
});
