/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import findThemeInjectable from "../../features/theme/files/renderer/find-theme.injectable";
import resolveThemeInjectable from "../../features/theme/files/renderer/resolve-theme.injectable";
import accentColorsInjectable from "../../features/user-preferences/common/accent-colors.injectable";
import themePreferenceInjectable from "../../features/user-preferences/common/theme-preference.injectable";
import { getTextColorOnAccent } from "./accent-colors";
import systemThemeConfigurationInjectable from "./system-theme.injectable";

import type { ReadonlyDeep } from "@freelensapp/type-fest";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

import type { LensColorName, LensTheme, LensThemeType } from "./lens-theme";

/**
 * The keys a custom accent replaces, per variant, in whichever theme is active. The two variants
 * of the built-in theme use the default accent in different keys: the dark one keeps a white
 * `sidebarSubmenuActiveColor`. Neither list has `colorInfo`, the color of the info statuses, which
 * an accent must not recolor.
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

/**
 * The chosen theme in the variant in use, with the accent applied. A theme that no longer exists
 * gives the built-in theme, and a theme with a single variant always gives that variant.
 */
// Annotated for declaration emit; see ../../extensions/renderer-api/theming.ts.
const activeThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme>>> = getInjectable({
  id: "active-theme",
  instantiate: (di) => {
    const findTheme = di.inject(findThemeInjectable);
    const resolveTheme = di.inject(resolveThemeInjectable);
    const themePreference = di.inject(themePreferenceInjectable);
    const systemThemeConfiguration = di.inject(systemThemeConfigurationInjectable);
    const accentColors = di.inject(accentColorsInjectable);

    return computed(() => {
      const { name, variant } = themePreference.get();
      const requestedVariant = variant === "system" ? systemThemeConfiguration.get() : variant;
      const baseTheme = resolveTheme(findTheme(name), requestedVariant);
      const accentColor = accentColors.get()[baseTheme.type];

      // Without a choice, the theme keeps its own accent. A choice of that same accent, such as
      // Teal on the default theme, keeps the theme as it is too, text on the accent included.
      if (!accentColor || accentColor.toLowerCase() === baseTheme.colors.primary.toLowerCase()) {
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
