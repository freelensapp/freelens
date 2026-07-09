/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import customAccentColorInjectable from "../../features/user-preferences/common/custom-accent-color.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { DEFAULT_ACCENT_COLOR } from "./accent-colors";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { LensColorName, LensTheme } from "./lens-theme";

/**
 * Color keys that represent the accent color across built-in themes.
 * Only these keys are considered when applying a custom accent override,
 * which avoids fragile, whole-theme hex scans that could recolor unrelated
 * colors in third-party themes or future built-in themes.
 */
const ACCENT_COLOR_KEYS: readonly LensColorName[] = [
  "blue",
  "primary",
  "buttonPrimaryBackground",
  "menuActiveBackground",
  "helmStableRepo",
  "colorInfo",
  "sidebarSubmenuActiveColor",
];

const activeThemeInjectable = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const lensThemes = di.inject(lensThemesInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);
    const customAccentColor = di.inject(customAccentColorInjectable);

    return computed(() => {
      const pref = lensColorThemePreference.get();
      let baseTheme: LensTheme;

      if (pref.useSystemTheme) {
        const systemThemeType = systemThemeConfiguration.get();
        const matchingTheme = themeDecls.find((theme) => theme.type === systemThemeType);

        baseTheme = matchingTheme ?? defaultLensTheme;
      } else {
        baseTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      const accentColor = customAccentColor.get();

      if (!accentColor) {
        return baseTheme;
      }

      const colorOverrides: Partial<Record<LensColorName, string>> = {};

      for (const key of ACCENT_COLOR_KEYS) {
        if (baseTheme.colors[key] === DEFAULT_ACCENT_COLOR) {
          colorOverrides[key] = accentColor;
        }
      }

      // Only adjust sidebar active text contrast when the accent background was actually changed.
      // Skipping this for themes that don't use the default accent preserves their custom sidebarActiveColor.
      if (Object.keys(colorOverrides).length > 0) {
        colorOverrides.sidebarActiveColor = baseTheme.type === "dark" ? "#ffffff" : "#1e2124";
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
