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

const ACCENT_COLOR_NAMES = ["primary", "blue"] as const;

const applyLensThemeInjectable = getInjectable({
  id: "apply-lens-theme",
  instantiate: (di): ApplyLensTheme => {
    const logger = di.inject(loggerInjectionToken);
    const resetTheme = di.inject(resetThemeInjectable);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    return (theme) => {
      try {
        const colors = object.entries(theme.colors);

        for (const [name, value] of colors) {
          document.documentElement.style.setProperty(`--${name}`, value);
        }

        // Apply custom accent color override if set by the user
        const customAccent = userPreferencesState.customAccentColor;
        if (customAccent) {
          for (const name of ACCENT_COLOR_NAMES) {
            document.documentElement.style.setProperty(`--${name}`, customAccent);
          }
        }

        // Adding universal theme flag which can be used in component styles
        document.body.classList.toggle("theme-light", theme.type === "light");
      } catch (error) {
        logger.error("[THEME]: Failed to apply active theme", error);
        resetTheme();
      }
    };
  },
  causesSideEffects: true,
});

export default applyLensThemeInjectable;
