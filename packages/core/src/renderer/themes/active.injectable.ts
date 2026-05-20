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
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { LensTheme } from "./lens-theme";

const applyAccentColor = (theme: LensTheme, accentColor: string): LensTheme => ({
  ...theme,
  colors: {
    ...theme.colors,
    blue: accentColor,
    primary: accentColor,
    colorInfo: accentColor,
    buttonPrimaryBackground: accentColor,
    helmStableRepo: accentColor,
    menuActiveBackground: accentColor,
  },
});

const activeThemeInjectable = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const lensThemes = di.inject(lensThemesInjectable);
    const themeDecls = di.injectMany(lensThemeDeclarationInjectionToken);
    const lensColorThemePreference = di.inject(lensColorThemePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const defaultLensTheme = di.inject(defaultLensThemeInjectable);
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => {
      const pref = lensColorThemePreference.get();
      const getTheme = () => {
        if (pref.useSystemTheme) {
          const systemThemeType = systemThemeConfiguration.get();
          const matchingTheme = themeDecls.find((theme) => theme.type === systemThemeType);

          assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

          return matchingTheme;
        }

        return lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      };

      const theme = getTheme();

      return state.customAccentColor ? applyAccentColor(theme, state.customAccentColor) : theme;
    });
  },
});

export default activeThemeInjectable;
