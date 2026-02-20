/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { computed } from "mobx";
import customAccentColorInjectable from "../../features/user-preferences/common/custom-accent-color.injectable";
import lensColorThemePreferenceInjectable from "../../features/user-preferences/common/lens-color-theme.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import defaultLensThemeInjectable from "./default-theme.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import lensThemesInjectable from "./themes.injectable";

import type { LensTheme } from "./lens-theme";

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

        assert(matchingTheme, `Missing theme declaration for system theme "${systemThemeType}"`);

        baseTheme = matchingTheme;
      } else {
        baseTheme = lensThemes.get(pref.lensThemeId) ?? defaultLensTheme;
      }

      const accentColor = customAccentColor.get();

      if (!accentColor) {
        return baseTheme;
      }

      // Override all colors that use the primary accent color
      // This ensures both root and iframe get the same theme with accent color applied
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          blue: accentColor,
          primary: accentColor,
          buttonPrimaryBackground: accentColor,
          menuActiveBackground: accentColor,
          helmStableRepo: accentColor,
          colorInfo: accentColor,
          sidebarSubmenuActiveColor: accentColor,
          // Keep sidebarActiveColor white for better contrast
          sidebarActiveColor: "#ffffff",
        },
      };
    });
  },
});

export default activeThemeInjectable;
