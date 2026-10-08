/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import resetThemeInjectable from "../../features/user-preferences/common/reset-theme.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

import type { LensTheme } from "./lens-theme";

export type ApplyLensTheme = (theme: LensTheme) => void;

/**
 * CSS variable names that use the accent/primary color and should be
 * overridden when the user selects a custom accent color.
 */
const commonAccentVars = [
  "--blue",
  "--primary",
  "--menuActiveBackground",
  "--buttonPrimaryBackground",
  "--helmStableRepo",
];

const applyLensThemeInjectable = getInjectable({
  id: "apply-lens-theme",
  instantiate: (di): ApplyLensTheme => {
    const logger = di.inject(loggerInjectionToken);
    const resetTheme = di.inject(resetThemeInjectable);
    const state = di.inject(userPreferencesStateInjectable);

    return (theme) => {
      try {
        const colors = object.entries(theme.colors);

        for (const [name, value] of colors) {
          document.documentElement.style.setProperty(`--${name}`, value);
        }

        // Adding universal theme flag which can be used in component styles
        document.body.classList.toggle("theme-light", theme.type === "light");

        // Apply custom accent color overrides if the user has set one
        const accentColor = state.accentColor;

        if (accentColor) {
          const accentVars = [...commonAccentVars];

          if (theme.type === "dark") {
            // In dark theme, colorInfo also uses the teal accent
            accentVars.push("--colorInfo");
          }

          if (theme.type === "light") {
            // In light theme, sidebarSubmenuActiveColor uses the teal accent
            accentVars.push("--sidebarSubmenuActiveColor");
          }

          for (const varName of accentVars) {
            document.documentElement.style.setProperty(varName, accentColor);
          }
        }
      } catch (error) {
        logger.error("[THEME]: Failed to apply active theme", error);
        resetTheme();
      }
    };
  },
  causesSideEffects: true,
});

export default applyLensThemeInjectable;

