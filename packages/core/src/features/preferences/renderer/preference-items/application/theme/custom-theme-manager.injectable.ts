/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import customThemesStorageInjectable from "../../../../../../renderer/themes/custom-themes-storage.injectable";
import lensDarkThemeInjectable from "../../../../../../renderer/themes/lens-dark.injectable";
import lensLightThemeInjectable from "../../../../../../renderer/themes/lens-light.injectable";
import { validateTheme, sanitizeThemeName } from "../../../../../../renderer/themes/theme-validation";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";

export interface CustomThemeManager {
  createTheme: (baseTheme: LensTheme, name: string) => { success: boolean; error?: string; theme?: LensTheme };
  updateTheme: (oldName: string, updatedTheme: LensTheme) => { success: boolean; error?: string };
  deleteTheme: (name: string) => { success: boolean; error?: string };
  duplicateTheme: (theme: LensTheme, newName: string) => { success: boolean; error?: string; theme?: LensTheme };
  exportTheme: (theme: LensTheme) => string;
  importTheme: (jsonString: string) => { success: boolean; error?: string; theme?: LensTheme };
}

const customThemeManagerInjectable = getInjectable({
  id: "custom-theme-manager",
  instantiate: (di): CustomThemeManager => {
    const customThemesStorage = di.inject(customThemesStorageInjectable);
    const darkTheme = di.inject(lensDarkThemeInjectable);
    const lightTheme = di.inject(lensLightThemeInjectable);

    return {
      createTheme: (baseTheme, name) => {
        const sanitizedName = sanitizeThemeName(name);

        if (!sanitizedName) {
          return { success: false, error: "Theme name cannot be empty" };
        }

        // Check if theme with this name already exists
        if (customThemesStorage.getTheme(sanitizedName)) {
          return { success: false, error: `A theme with the name "${sanitizedName}" already exists` };
        }

        const newTheme: LensTheme = {
          ...baseTheme,
          name: sanitizedName,
          description: `Custom theme based on ${baseTheme.name}`,
          author: "User",
          isCustom: true,
          isDefault: false,
        };

        const validation = validateTheme(newTheme);

        if (!validation.valid) {
          return { success: false, error: validation.errors.join(", ") };
        }

        customThemesStorage.addTheme(newTheme);
        return { success: true, theme: newTheme };
      },

      updateTheme: (oldName, updatedTheme) => {
        const sanitizedName = sanitizeThemeName(updatedTheme.name);

        if (!sanitizedName) {
          return { success: false, error: "Theme name cannot be empty" };
        }

        // Check if trying to rename to an existing theme name
        if (oldName !== sanitizedName && customThemesStorage.getTheme(sanitizedName)) {
          return { success: false, error: `A theme with the name "${sanitizedName}" already exists` };
        }

        const themeToUpdate: LensTheme = {
          ...updatedTheme,
          name: sanitizedName,
          isCustom: true,
        };

        const validation = validateTheme(themeToUpdate);

        if (!validation.valid) {
          return { success: false, error: validation.errors.join(", ") };
        }

        // If renaming, delete old and add new
        if (oldName !== sanitizedName) {
          customThemesStorage.removeTheme(oldName);
        }

        customThemesStorage.updateTheme(sanitizedName, themeToUpdate);
        return { success: true };
      },

      deleteTheme: (name) => {
        const theme = customThemesStorage.getTheme(name);

        if (!theme) {
          return { success: false, error: "Theme not found" };
        }

        if (!theme.isCustom) {
          return { success: false, error: "Cannot delete built-in themes" };
        }

        customThemesStorage.removeTheme(name);
        return { success: true };
      },

      duplicateTheme: (theme, newName) => {
        const sanitizedName = sanitizeThemeName(newName);

        if (!sanitizedName) {
          return { success: false, error: "Theme name cannot be empty" };
        }

        if (customThemesStorage.getTheme(sanitizedName)) {
          return { success: false, error: `A theme with the name "${sanitizedName}" already exists` };
        }

        const duplicatedTheme: LensTheme = {
          ...theme,
          name: sanitizedName,
          description: `Copy of ${theme.name}`,
          isCustom: true,
          isDefault: false,
        };

        customThemesStorage.addTheme(duplicatedTheme);
        return { success: true, theme: duplicatedTheme };
      },

      exportTheme: (theme) => {
        const exportData = {
          ...theme,
          exportedAt: new Date().toISOString(),
          version: "1.0.0",
        };

        return JSON.stringify(exportData, null, 2);
      },

      importTheme: (jsonString) => {
        try {
          const importedData = JSON.parse(jsonString);

          // Remove metadata fields
          const { exportedAt, version, isCustom, isDefault, ...themeData } = importedData;

          const theme: LensTheme = {
            ...themeData,
            isCustom: true,
            isDefault: false,
          };

          const validation = validateTheme(theme);

          if (!validation.valid) {
            return { success: false, error: `Invalid theme: ${validation.errors.join(", ")}` };
          }

          // Check if theme with this name already exists
          let finalName = theme.name;
          let counter = 1;

          while (customThemesStorage.getTheme(finalName)) {
            finalName = `${theme.name} (${counter})`;
            counter++;
          }

          const finalTheme = { ...theme, name: finalName };
          customThemesStorage.addTheme(finalTheme);

          return { success: true, theme: finalTheme };
        } catch (error) {
          return { success: false, error: `Failed to parse theme: ${String(error)}` };
        }
      },
    };
  },
});

export default customThemeManagerInjectable;
