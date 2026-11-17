/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultTheme, findBuiltInTheme } from "../../../features/theme/files/common/builtin-theme";
import { parseThemeFile } from "../../../features/theme/files/common/parse";
import { resolveThemeVariant } from "../../../features/theme/files/common/resolve";
import importedThemesStateInjectable from "../../../features/theme/files/renderer/imported-themes-state.injectable";
import accentColorsInjectable from "../../../features/user-preferences/common/accent-colors.injectable";
import userPreferenceDescriptorsInjectable from "../../../features/user-preferences/common/preference-descriptors.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import themePreferenceInjectable from "../../../features/user-preferences/common/theme-preference.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { accentColorOptions, getContrastRatio, getTextColorOnAccent } from "../accent-colors";
import activeThemeInjectable from "../active.injectable";
import systemThemeConfigurationInjectable from "../system-theme.injectable";
import xtermColorThemeInjectable from "../terminal-colors.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { AccentColors } from "../../../features/user-preferences/common/accent-colors.injectable";

const white = "#ffffff";
const dark = "#1e2124";
const cyan = "#00bcd4";
const purple = "#9c27b0";
const teal = "#00a7a0";

describe("active theme with an accent color", () => {
  let di: DiContainer;

  const getThemes = (variant: "Dark" | "Light", accentColors: Partial<AccentColors>) => {
    const type = variant === "Dark" ? "dark" : "light";

    di = getDiForUnitTesting();
    di.override(accentColorsInjectable, () => computed(() => ({ dark: undefined, light: undefined, ...accentColors })));
    di.override(themePreferenceInjectable, () => computed(() => ({ name: "freelens", variant: type })));

    const baseTheme = resolveThemeVariant(defaultTheme, type, defaultTheme);

    return { activeTheme: di.inject(activeThemeInjectable).get(), baseTheme };
  };

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  it.each(["Dark", "Light"] as const)("leaves the %s theme unchanged without an accent", (lensThemeId) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, {});

    expect(activeTheme).toEqual(baseTheme);
  });

  it.each(["Dark", "Light"] as const)("leaves the %s theme unchanged with its own accent, Teal", (lensThemeId) => {
    const { activeTheme, baseTheme } = getThemes(lensThemeId, { dark: teal, light: teal });

    expect(activeTheme).toEqual(baseTheme);
  });

  it("compares the theme's own accent regardless of case", () => {
    const { activeTheme, baseTheme } = getThemes("Dark", { dark: teal.toUpperCase() });

    expect(activeTheme).toEqual(baseTheme);
  });

  it("applies the dark accent to the dark theme only", () => {
    expect(getThemes("Dark", { dark: purple }).activeTheme.colors.primary).toBe(purple);
    expect(getThemes("Light", { dark: purple }).activeTheme.colors.primary).toBe(teal);
  });

  it("applies the light accent to the light theme only", () => {
    expect(getThemes("Light", { light: purple }).activeTheme.colors.primary).toBe(purple);
    expect(getThemes("Dark", { light: purple }).activeTheme.colors.primary).toBe(teal);
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
      di.override(themePreferenceInjectable, () => computed(() => ({ name: "freelens", variant: "system" as const })));
    });

    it("applies the dark accent in dark mode", () => {
      di.override(systemThemeConfigurationInjectable, () => observable.box<"dark" | "light">("dark"));

      const theme = di.inject(activeThemeInjectable).get();

      expect(theme.type).toBe("dark");
      expect(theme.colors.primary).toBe(purple);
    });

    it("applies the light accent in light mode", () => {
      di.override(systemThemeConfigurationInjectable, () => observable.box<"dark" | "light">("light"));

      const theme = di.inject(activeThemeInjectable).get();

      expect(theme.type).toBe("light");
      expect(theme.colors.primary).toBe(cyan);
    });
  });
});

describe("active theme from theme files", () => {
  let di: DiContainer;

  const importTheme = (content: string) => {
    const result = parseThemeFile(content);

    if (!result.isValid) {
      throw new Error(result.error);
    }

    di.inject(importedThemesStateInjectable).set({
      themes: [{ theme: result.theme, fileName: `${result.theme.metadata.name}.yaml`, unknownTokens: [] }],
      invalidFiles: [],
    });
  };

  const darkOnlyTheme = `apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: midnight
spec:
  displayName: Midnight
  author: Someone
  dark:
    colors:
      primary: "#7c4dff"
      mainBackground: "#000000"
    terminalColors:
      background: "#010101"
`;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(systemThemeConfigurationInjectable, () => observable.box<"dark" | "light">("light"));
  });

  it("is the built-in theme in the variant of the operating system by default", () => {
    const theme = di.inject(activeThemeInjectable).get();

    expect(theme).toMatchObject({ name: "freelens", type: "light", isDefault: true });
    expect(theme.colors.mainBackground).toBe("#f1f1f1");
  });

  it("names the editor theme of the variant", () => {
    expect(di.inject(activeThemeInjectable).get().monacoTheme).toBe("freelens-theme-freelens-light");
  });

  describe("with an imported theme that has only a dark variant selected", () => {
    beforeEach(() => {
      importTheme(darkOnlyTheme);
      di.inject(userPreferencesStateInjectable).theme = "midnight";
      di.inject(userPreferencesStateInjectable).themeVariant = "system";
    });

    it("stays dark whatever the operating system's mode is", () => {
      expect(di.inject(activeThemeInjectable).get().type).toBe("dark");
    });

    it("stays dark when the light variant is chosen", () => {
      di.inject(userPreferencesStateInjectable).themeVariant = "light";

      expect(di.inject(activeThemeInjectable).get().type).toBe("dark");
    });

    it("describes the theme as extensions see it", () => {
      expect(di.inject(activeThemeInjectable).get()).toMatchObject({
        name: "midnight",
        type: "dark",
        author: "Someone",
        description: "",
        monacoTheme: "freelens-theme-midnight-dark",
      });
      expect(di.inject(activeThemeInjectable).get().isDefault).toBeUndefined();
    });

    it("takes the missing tokens from the dark variant of the built-in theme", () => {
      const { colors } = di.inject(activeThemeInjectable).get();

      expect(colors.mainBackground).toBe("#000000");
      expect(colors.sidebarBackground).toBe(defaultTheme.spec.dark?.colors?.sidebarBackground);
    });

    it("keeps the theme's own accent without a choice", () => {
      expect(di.inject(activeThemeInjectable).get().colors.primary).toBe("#7c4dff");
    });

    it("applies the accent the user chose to the theme", () => {
      di.override(accentColorsInjectable, () => computed(() => ({ dark: cyan, light: undefined })));

      expect(di.inject(activeThemeInjectable).get().colors.primary).toBe(cyan);
    });

    it("falls back to the built-in theme when the theme is removed", () => {
      di.inject(importedThemesStateInjectable).set({ themes: [], invalidFiles: [] });

      expect(di.inject(activeThemeInjectable).get()).toMatchObject({ name: "freelens", type: "light" });
    });

    it("gives the terminal the colors of the theme", () => {
      expect(di.inject(xtermColorThemeInjectable).get().background).toBe("#010101");
    });
  });

  describe.each([
    ["ayu", "#0d1017", "#f8f9fa"],
    ["ayu-mirage", "#1f2430", "#f8f9fa"],
    ["dracula", "#282a36", "#fffbeb"],
    ["graphite", "#101215", "#eaebee"],
    ["catppuccin", "#1e1e2e", "#eff1f5"],
    ["solarized", "#002b36", "#fdf6e3"],
    ["high-contrast", "#000000", "#ffffff"],
  ])("with the built-in theme %s selected", (name, darkMainBackground, lightMainBackground) => {
    const systemType = observable.box<"dark" | "light">("light");

    beforeEach(() => {
      runInAction(() => systemType.set("light"));
      di.override(systemThemeConfigurationInjectable, () => computed(() => systemType.get()));
      di.inject(userPreferencesStateInjectable).theme = name;
      di.inject(userPreferencesStateInjectable).themeVariant = "system";
    });

    it("follows the operating system between its variants", () => {
      const activeTheme = di.inject(activeThemeInjectable);

      expect(activeTheme.get()).toMatchObject({ name, type: "light", monacoTheme: `freelens-theme-${name}-light` });
      expect(activeTheme.get().colors.mainBackground).toBe(lightMainBackground);

      runInAction(() => systemType.set("dark"));

      expect(activeTheme.get()).toMatchObject({ name, type: "dark", monacoTheme: `freelens-theme-${name}-dark` });
      expect(activeTheme.get().colors.mainBackground).toBe(darkMainBackground);
    });

    it("gives the terminal the colors of the variant", () => {
      expect(di.inject(xtermColorThemeInjectable).get().background).toBe(
        findBuiltInTheme(name)?.spec.light?.terminalColors?.background,
      );
    });

    it("keeps the theme's own accent without a choice", () => {
      expect(di.inject(activeThemeInjectable).get().colors.primary).toBe(
        findBuiltInTheme(name)?.spec.light?.colors?.primary,
      );
    });

    it("applies the accent the user chose, with the text on it", () => {
      di.override(accentColorsInjectable, () => computed(() => ({ dark: undefined, light: purple })));

      const { colors } = di.inject(activeThemeInjectable).get();

      expect(colors.primary).toBe(purple);
      expect(colors.buttonPrimaryBackground).toBe(purple);
      expect(colors.textColorOnPrimary).toBe(white);
    });

    it.each(["dark", "light"] as const)("applies Teal chosen for the %s variant", (variant) => {
      runInAction(() => systemType.set(variant));
      di.inject(userPreferencesStateInjectable)[variant === "dark" ? "accentColorDark" : "accentColorLight"] = teal;

      const { colors } = di.inject(activeThemeInjectable).get();

      expect(colors.primary).toBe(teal);
      expect(colors.blue).toBe(teal);
      expect(colors.buttonPrimaryBackground).toBe(teal);
      expect(colors.textColorOnPrimary).toBe(dark);
    });

    it("keeps the theme's own accent again when the choice is cleared", () => {
      const state = di.inject(userPreferencesStateInjectable);

      state.accentColorLight = teal;
      state.accentColorLight = undefined;

      expect(di.inject(activeThemeInjectable).get().colors.primary).toBe(
        findBuiltInTheme(name)?.spec.light?.colors?.primary,
      );
    });
  });

  describe("the terminal theme", () => {
    it("can be a variant of another theme", () => {
      importTheme(darkOnlyTheme);
      di.inject(userPreferencesStateInjectable).terminalTheme = "freelens";
      di.inject(userPreferencesStateInjectable).terminalThemeVariant = "dark";

      expect(di.inject(xtermColorThemeInjectable).get().background).toBe(
        defaultTheme.spec.dark?.terminalColors?.background,
      );
    });

    it("falls back to the built-in theme when the theme is removed", () => {
      di.inject(userPreferencesStateInjectable).terminalTheme = "midnight";
      di.inject(userPreferencesStateInjectable).terminalThemeVariant = "dark";

      expect(di.inject(xtermColorThemeInjectable).get().background).toBe(
        defaultTheme.spec.dark?.terminalColors?.background,
      );
    });
  });
});

describe("text on an accent", () => {
  it.each(accentColorOptions)("reaches WCAG AA on $label", ({ value }) => {
    expect(getContrastRatio(value, getTextColorOnAccent(value))).toBeGreaterThanOrEqual(4.5);
  });

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

  it.each(["accentColorDark", "accentColorLight"] as const)("%s stores Teal like any other color", (name) => {
    expect(getDescriptors()[name].toStore(teal)).toBe(teal);
  });

  it.each(["accentColorDark", "accentColorLight"] as const)("%s stores a custom accent", (name) => {
    expect(getDescriptors()[name].toStore(purple)).toBe(purple);
  });

  it.each(["accentColorDark", "accentColorLight"] as const)("%s stores nothing when unset", (name) => {
    expect(getDescriptors()[name].toStore(undefined)).toBeUndefined();
  });
});
