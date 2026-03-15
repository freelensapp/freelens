/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import customAccentColorInjectable from "../../features/user-preferences/common/custom-accent-color.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { LensColorName, LensTheme } from "./lens-theme";

/** The default accent color used by built-in themes. */
const DEFAULT_ACCENT_COLOR = "#00a7a0";

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

      // Build theme-aware overrides: only replace colors that actually use
      // the default accent in this specific base theme.
      const colorOverrides: Partial<Record<LensColorName, string>> = {};

      for (const [name, value] of Object.entries(baseTheme.colors) as [LensColorName, string][]) {
        if (value === DEFAULT_ACCENT_COLOR) {
          colorOverrides[name] = accentColor;
        }
      }

      // Ensure sidebar active text contrasts with the accent background
      colorOverrides.sidebarActiveColor = baseTheme.type === "dark" ? "#ffffff" : "#1e2124";

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
