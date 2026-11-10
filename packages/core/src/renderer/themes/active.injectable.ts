/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import customAccentColorInjectable from "../../features/user-preferences/common/custom-accent-color.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { DEFAULT_ACCENT_COLOR } from "./accent-colors";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensColorName, LensTheme } from "./lens-theme";

/**
 * Color keys where a theme may use the default accent color.
 * A custom accent replaces one of these keys only when the base theme sets it to
 * `DEFAULT_ACCENT_COLOR`; a key with any other value keeps it. The dark theme therefore
 * keeps its white `sidebarSubmenuActiveColor`, while the light theme, which uses the
 * default accent there, changes. Keeping to this list, rather than scanning the whole
 * theme for the color, leaves unrelated colors of other themes alone.
 */
const DEFAULT_ACCENT_CANDIDATE_KEYS: readonly LensColorName[] = [
  "blue",
  "primary",
  "buttonPrimaryBackground",
  "menuActiveBackground",
  "helmStableRepo",
  "colorInfo",
  "sidebarSubmenuActiveColor",
];

// Annotated for declaration emit; see ./declaration.ts.
const activeThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme>>> = getInjectable({
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

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        baseTheme = matchingTheme;
      } else {
        baseTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      const accentColor = customAccentColor.get();

      if (!accentColor || accentColor === DEFAULT_ACCENT_COLOR) {
        return baseTheme;
      }

      const colorOverrides: Partial<Record<LensColorName, string>> = {};

      for (const key of DEFAULT_ACCENT_CANDIDATE_KEYS) {
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
