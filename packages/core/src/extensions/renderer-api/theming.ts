/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import activeThemeInjectable from "../../renderer/themes/active.injectable";
import customThemesStorageInjectable from "../../renderer/themes/custom-themes-storage.injectable";

import type { LensTheme } from "../../renderer/themes/lens-theme";

export const activeTheme = asLegacyGlobalForExtensionApi(activeThemeInjectable);

/**
 * @deprecated This hides the reactivity of active theme, use {@link activeTheme} instead
 */
export function getActiveTheme() {
  return activeTheme.get();
}

const customThemesStorage = asLegacyGlobalForExtensionApi(customThemesStorageInjectable);

/**
 * Register a custom theme that extensions can use to provide additional themes.
 * @param theme The theme to register
 * @returns true if the theme was successfully registered, false if a theme with that name already exists
 */
export function registerTheme(theme: LensTheme): boolean {
  try {
    const existingTheme = customThemesStorage.getTheme(theme.name);

    if (existingTheme) {
      return false;
    }

    customThemesStorage.addTheme({ ...theme, isCustom: true });
    return true;
  } catch (error) {
    console.error("Failed to register theme:", error);
    return false;
  }
}

/**
 * Unregister a custom theme by name.
 * @param themeName The name of the theme to unregister
 * @returns true if the theme was successfully unregistered, false otherwise
 */
export function unregisterTheme(themeName: string): boolean {
  try {
    const theme = customThemesStorage.getTheme(themeName);

    if (!theme || !theme.isCustom) {
      return false;
    }

    customThemesStorage.removeTheme(themeName);
    return true;
  } catch (error) {
    console.error("Failed to unregister theme:", error);
    return false;
  }
}

/**
 * Get all registered themes (built-in and custom).
 * @returns Array of all themes
 */
export function getThemes(): LensTheme[] {
  return customThemesStorage.themes;
}

export type { LensTheme };
