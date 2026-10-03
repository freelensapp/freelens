

/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { app } from "electron";
import fs from "fs";
import path from "path";
import type { LensTheme } from "./lens-theme";

const customThemeManagerInjectable = getInjectable({
  id: "custom-theme-manager",
  instantiate: () => {
    const saveCustomTheme = (theme: LensTheme): boolean => {
      const themesDir = path.join(app.getPath("userData"), "themes");

      try {
        if (!fs.existsSync(themesDir)) {
          fs.mkdirSync(themesDir, { recursive: true });
        }

        const filePath = path.join(themesDir, `${theme.name.replace(/\s+/g, "-")}.json`);
        fs.writeFileSync(filePath, JSON.stringify(theme, null, 2), "utf-8");
        return true;
      } catch (error) {
        console.error("Error saving custom theme:", error);
        return false;
      }
    };

    const deleteCustomTheme = (themeName: string): boolean => {
      const themesDir = path.join(app.getPath("userData"), "themes");
      const fileName = `${themeName.replace(/\s+/g, "-")}.json`;
      const filePath = path.join(themesDir, fileName);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error deleting custom theme:", error);
        return false;
      }
    };

    return {
      saveCustomTheme,
      deleteCustomTheme,
    };
  },
});

export default customThemeManagerInjectable;

