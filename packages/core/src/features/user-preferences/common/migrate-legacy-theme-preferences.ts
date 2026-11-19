/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultThemePreference } from "../../../common/vars";

import type { UserPreferencesModel } from "./preferences-helpers";

/**
 * The preferences as Freelens stored them before themes became files, which had a single
 * `colorTheme`, `"system"`, `"Dark"` or `"Light"`, and a terminal theme that named the same themes.
 */
export type LegacyThemePreferences = UserPreferencesModel & {
  colorTheme?: string;
};

/**
 * Turns the theme preferences of an earlier Freelens into a theme and a variant, so that an
 * update changes nothing visible:
 *
 * - `colorTheme` `"system"` becomes the `System` variant of the built-in theme, `"Dark"` and
 *   `"Light"` its `Dark` and `Light` variant. Any other value used to fall back to the default
 *   theme, which was the dark one.
 * - `terminalTheme` `"Dark"` and `"Light"` become the matching variant of the built-in theme. Any
 *   other value that is not a theme name used to match the application theme, and still does.
 *
 * Preferences that already have a theme or a variant are not touched, and `colorTheme` is dropped:
 * the next write of the preferences no longer has it.
 */
export const migrateLegacyThemePreferences = (preferences: LegacyThemePreferences): UserPreferencesModel => {
  const { colorTheme, ...result } = preferences;

  if (colorTheme !== undefined && result.theme === undefined && result.themeVariant === undefined) {
    result.theme = defaultThemePreference;
    result.themeVariant = colorTheme === "system" ? "system" : colorTheme === "Light" ? "light" : "dark";
  }

  if (result.terminalTheme === "Dark" || result.terminalTheme === "Light") {
    result.terminalThemeVariant = result.terminalTheme === "Light" ? "light" : "dark";
    result.terminalTheme = defaultThemePreference;
  }

  return result;
};
