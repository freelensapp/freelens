/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import allLensThemesInjectable from "./all-themes.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import { withAccentColor } from "./prolens/create-theme";
import { systemThemeNames } from "./prolens/palettes";
import systemThemeConfigurationInjectable from "./system-theme.injectable";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

// Annotated for declaration emit; see ./declaration.ts.
const activeThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme>>> = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const allThemes = di.inject(allLensThemesInjectable);
    const state = di.inject(userPreferencesStateInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);

    const baseTheme = computed(() => {
      const pref = lensColorThemePreference.get();

      if (pref.useSystemTheme) {
        const systemThemeType = systemThemeConfiguration.get();
        const matchingTheme =
          allThemes.get().get(systemThemeNames[systemThemeType])?.theme ??
          themeDecls.find((theme) => theme.type === systemThemeType);

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        return matchingTheme;
      }

      return allThemes.get().get(pref.lensThemeId)?.theme ?? defaultLensTheme;
    });

    // The accent colour override applies to whichever theme is active.
    return computed(() => withAccentColor(baseTheme.get(), state.appearance?.accentColor));
  },
});

export default activeThemeInjectable;
