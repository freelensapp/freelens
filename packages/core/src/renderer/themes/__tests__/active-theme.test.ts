/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import accentColorsInjectable from "../../../features/user-preferences/common/accent-colors.injectable";
import lensColorThemePreferenceInjectable from "../../../features/user-preferences/common/lens-color-theme.injectable";
import userPreferenceDescriptorsInjectable from "../../../features/user-preferences/common/preference-descriptors.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { accentColorOptions, DEFAULT_ACCENT_COLOR, getContrastRatio, getTextColorOnAccent } from "../accent-colors";
import activeThemeInjectable from "../active.injectable";
import systemThemeConfigurationInjectable from "../system-theme.injectable";
import lensThemesInjectable from "../themes.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { AccentColors } from "../../../features/user-preferences/common/accent-colors.injectable";

const white = "#ffffff";
const dark = "#1e2124";
const cyan = "#00bcd4";
const purple = "#9c27b0";

describe("active theme with an accent color", () => {
  let di: DiContainer;

  const getThemes = (lensThemeId: string, accentColors: Partial<AccentColors>) => {
    di = getDiForUnitTesting();
    di.override(accentColorsInjectable, () => computed(() => ({ dark: undefined, light: undefined, ...accentColors })));
    di.override(lensColorThemePreferenceInjectable, () => computed(() => ({ useSystemTheme: false, lensThemeId })));

    const baseTheme = di.inject(lensThemesInjectable).get(lensThemeId);

    if (!baseTheme) {
      throw new Error(`Missing built-in theme "${lensThemeId}"`);
    }

    return { activeTheme: di.inject(activeThemeInjectable).get(), baseTheme };
  };

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  it.each(["Dark", "Light"])("leaves the %s theme unchanged without an accent", (lensThemeId) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, {});

    expect(activeTheme).toBe(baseTheme);
  });

  it.each(["Dark", "Light"])("leaves the %s theme unchanged with the default accent", (lensThemeId) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, {
      dark: DEFAULT_ACCENT_COLOR,
      light: DEFAULT_ACCENT_COLOR,
    });

    expect(activeTheme).toBe(baseTheme);
  });

  it("applies the dark accent to the dark theme only", () => {
    expect(getThemes("Dark", { dark: purple }).activeTheme.colors.primary).toBe(purple);
    expect(getThemes("Light", { dark: purple }).activeTheme.colors.primary).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("applies the light accent to the light theme only", () => {
    expect(getThemes("Light", { light: purple }).activeTheme.colors.primary).toBe(purple);
    expect(getThemes("Dark", { light: purple }).activeTheme.colors.primary).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("replaces the accent keys of the dark theme", () => {
    const { colors } = getThemes("Dark", { dark: purple }).activeTheme;

    expect(colors.blue).toBe(purple);
    expect(colors.primary).toBe(purple);
    expect(colors.buttonPrimaryBackground).toBe(purple);
    expect(colors.menuActiveBackground).toBe(purple);
    expect(colors.helmStableRepo).toBe(purple);
  });

  it("keeps the white sidebarSubmenuActiveColor of the dark theme", () => {
    const { colors } = getThemes("Dark", { dark: purple }).activeTheme;

    expect(colors.sidebarSubmenuActiveColor).toBe(white);
  });

  it("replaces the teal sidebarSubmenuActiveColor of the light theme", () => {
    const { colors } = getThemes("Light", { light: purple }).activeTheme;

    expect(colors.sidebarSubmenuActiveColor).toBe(purple);
  });

  it.each([
    ["Dark", "dark"],
    ["Light", "light"],
  ] as const)("keeps the colorInfo status color of the %s theme", (lensThemeId, variant) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, { [variant]: purple });

    expect(activeTheme.colors.colorInfo).toBe(baseTheme.colors.colorInfo);
  });

  it.each([
    ["Dark", "dark"],
    ["Light", "light"],
  ] as const)("keeps the other colors of the %s theme", (lensThemeId, variant) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, { [variant]: purple });

    expect(activeTheme.colors.colorError).toBe(baseTheme.colors.colorError);
    expect(activeTheme.colors.colorWarning).toBe(baseTheme.colors.colorWarning);
    expect(activeTheme.colors.mainBackground).toBe(baseTheme.colors.mainBackground);
    expect(activeTheme.name).toBe(baseTheme.name);
    expect(activeTheme.type).toBe(baseTheme.type);
  });

  it.each([
    ["Dark", "dark", cyan, dark],
    ["Light", "light", cyan, dark],
    ["Dark", "dark", purple, white],
    ["Light", "light", purple, white],
  ] as const)("on %s with the accent %s, draws the text on the accent in %s", (lensThemeId, variant, accent, text) => {
    const { colors } = getThemes(lensThemeId, { [variant]: accent }).activeTheme;

    expect(colors.textColorOnPrimary).toBe(text);
    expect(colors.sidebarActiveColor).toBe(text);
    expect(colors.drawerTitleText).toBe(text);
  });

  describe("when the theme follows the computer", () => {
    beforeEach(() => {
      di.override(accentColorsInjectable, () => computed(() => ({ dark: purple, light: cyan })));
      di.override(lensColorThemePreferenceInjectable, () =>
        computed(() => ({ useSystemTheme: true, lensThemeId: "" })),
      );
    });

    it("applies the dark accent in dark mode", () => {
      di.override(systemThemeConfigurationInjectable, () => computed(() => "dark" as const));

      const theme = di.inject(activeThemeInjectable).get();

      expect(theme.type).toBe("dark");
      expect(theme.colors.primary).toBe(purple);
    });

    it("applies the light accent in light mode", () => {
      di.override(systemThemeConfigurationInjectable, () => computed(() => "light" as const));

      const theme = di.inject(activeThemeInjectable).get();

      expect(theme.type).toBe("light");
      expect(theme.colors.primary).toBe(cyan);
    });
  });
});

describe("text on an accent", () => {
  it.each(accentColorOptions.filter(({ value }) => value !== DEFAULT_ACCENT_COLOR))(
    "reaches WCAG AA on $label",
    ({ value }) => {
      expect(getContrastRatio(value, getTextColorOnAccent(value))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("takes the text with the better contrast", () => {
    expect(getTextColorOnAccent(cyan)).toBe(dark);
    expect(getTextColorOnAccent(purple)).toBe(white);
  });

  it("accepts the short hex form", () => {
    expect(getTextColorOnAccent("#fff")).toBe(dark);
  });

  it("falls back to white for a value that is not a hex color", () => {
    expect(getTextColorOnAccent("teal")).toBe(white);
  });
});

describe("accent color preferences", () => {
  const getDescriptors = () => getDiForUnitTesting().inject(userPreferenceDescriptorsInjectable);

  it.each(["accentColorDark", "accentColorLight"] as const)("%s does not store the default accent", (name) => {
    expect(getDescriptors()[name].toStore(DEFAULT_ACCENT_COLOR)).toBeUndefined();
  });

  it.each(["accentColorDark", "accentColorLight"] as const)("%s stores a custom accent", (name) => {
    expect(getDescriptors()[name].toStore(purple)).toBe(purple);
  });

  it.each(["accentColorDark", "accentColorLight"] as const)("%s stores nothing when unset", (name) => {
    expect(getDescriptors()[name].toStore(undefined)).toBeUndefined();
  });
});
