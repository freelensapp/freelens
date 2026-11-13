
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { app } from "electron";
import fs from "fs";
import path from "path";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import type { LensTheme } from "./lens-theme";

const customThemesLoaderInjectable = getInjectable({
  id: "custom-themes-loader",
  instantiate: () => {
    const loadCustomThemes = (): LensTheme[] => {
      const customThemes: LensTheme[] = [];
      const themesDir = path.join(app.getPath("userData"), "themes");

      try {
        if (!fs.existsSync(themesDir)) {
          fs.mkdirSync(themesDir, { recursive: true });
          return customThemes;
        }

        const files = fs.readdirSync(themesDir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            try {
              const filePath = path.join(themesDir, file);
              const fileContent = fs.readFileSync(filePath, "utf-8");
              const theme = JSON.parse(fileContent) as LensTheme;

              // Validate required fields
              if (theme.name && theme.type && theme.colors) {
                customThemes.push(theme);
              }
            } catch (error) {
              console.error(`Error loading custom theme from ${file}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading custom themes:", error);
      }

      return customThemes;
    };

    return loadCustomThemes;
  },
});

export default customThemesLoaderInjectable;
