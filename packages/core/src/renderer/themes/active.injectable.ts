/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import accentColorsInjectable from "../../features/user-preferences/common/accent-colors.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { DEFAULT_ACCENT_COLOR, getTextColorOnAccent } from "./accent-colors";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensColorName, LensTheme, LensThemeType } from "./lens-theme";

/**
 * The keys a custom accent replaces, per variant. The two built-in themes use the default
 * accent in different keys: the dark one keeps a white `sidebarSubmenuActiveColor`. Neither
 * list has `colorInfo`, the color of the info statuses, which an accent must not recolor.
 */
const accentKeys: Record<LensThemeType, readonly LensColorName[]> = {
  dark: ["blue", "primary", "buttonPrimaryBackground", "menuActiveBackground", "helmStableRepo"],
  light: [
    "blue",
    "primary",
    "buttonPrimaryBackground",
    "menuActiveBackground",
    "helmStableRepo",
    "sidebarSubmenuActiveColor",
  ],
};

/**
 * The keys of the text drawn on an accent background, which take white or dark text,
 * whichever contrasts better with a custom accent.
 */
const textOnAccentKeys: readonly LensColorName[] = ["textColorOnPrimary", "sidebarActiveColor", "drawerTitleText"];

// Annotated for declaration emit; see ./declaration.ts.
const activeThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme>>> = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const lensThemes = di.inject(lensThemesInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);
    const accentColors = di.inject(accentColorsInjectable);

    return computed(() => {
      const pref = lensColorThemePreference.get();
      let baseTheme: LensTheme;

      if (pref.useSystemTheme) {
        const systemThemeType = systemThemeConfiguration.get();
        const matchingTheme = themeDecls.find((theme) => theme.type === systemThemeType);

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        baseTheme = matchingTheme;
      } else {
        baseTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      const accentColor = accentColors.get()[baseTheme.type];

      if (!accentColor || accentColor === DEFAULT_ACCENT_COLOR) {
        return baseTheme;
      }

      const textColor = getTextColorOnAccent(accentColor);
      const colorOverrides: Partial<Record<LensColorName, string>> = {};

      for (const key of accentKeys[baseTheme.type]) {
        colorOverrides[key] = accentColor;
      }

      for (const key of textOnAccentKeys) {
        colorOverrides[key] = textColor;
      }

      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          ...colorOverrides,
        },
      };
    });
  },
});

export default activeThemeInjectable;
