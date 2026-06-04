/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { computed } from "mobx";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { withCustomThemeColors } from "./custom-theme-colors";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

const activeThemeInjectable = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const lensThemes = di.inject(lensThemesInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    return computed(() => {
      const pref = lensColorThemePreference.get();
      let activeTheme: ReadonlyDeep<LensTheme>;

      if (pref.useSystemTheme) {
        const systemThemeType = systemThemeConfiguration.get();
        const matchingTheme = themeDecls.find((theme) => theme.type === systemThemeType);

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        activeTheme = matchingTheme;
      } else {
        activeTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      return withCustomThemeColors(activeTheme, userPreferencesState.customThemeColors);
    });
  },
});

export default activeThemeInjectable;
