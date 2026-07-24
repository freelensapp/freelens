/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import customThemeColorsInjectable from "../../features/user-preferences/common/custom-theme-colors.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

// Annotated for declaration emit; see ./declaration.ts.
const activeThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme>>> = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const lensThemes = di.inject(lensThemesInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);
    const customThemeColors = di.inject(customThemeColorsInjectable);

    return computed(() => {
      const pref = lensColorThemePreference.get();
      let baseTheme: ReadonlyDeep<LensTheme>;

      if (pref.useSystemTheme) {
        const systemThemeType = systemThemeConfiguration.get();
        const matchingTheme = themeDecls.find((theme) => theme.type === systemThemeType);

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        baseTheme = matchingTheme;
      } else {
        baseTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      const customColors = customThemeColors.get();
      const customKeys = Object.keys(customColors);

      if (customKeys.length === 0) {
        return baseTheme;
      }

      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          ...customColors,
        },
      } as ReadonlyDeep<LensTheme>;
    });
  },
});

export default activeThemeInjectable;
