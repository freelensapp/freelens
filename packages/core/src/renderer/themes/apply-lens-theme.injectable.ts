/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { object } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import resetThemeInjectable from "../../features/user-preferences/common/reset-theme.injectable";

import type { LensTheme } from "./lens-theme";

const kebabCase = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export type ApplyLensTheme = (theme: LensTheme) => void;

const applyLensThemeInjectable = getInjectable({
  id: "apply-lens-theme",
  instantiate: (di): ApplyLensTheme => {
    const logger = di.inject(loggerInjectionToken);
    const resetTheme = di.inject(resetThemeInjectable);

    return (theme) => {
      try {
        const colors = object.entries(theme.colors);

        for (const [name, value] of colors) {
          document.documentElement.style.setProperty(`--${name}`, value);
        }

        // Adding universal theme flag which can be used in component styles
        document.body.classList.toggle("theme-light", theme.type === "light");

        // Themes that declare `uiV2` switch on the v2 interface; its colors become --v2-* properties.
        // The class gates every v2 style, so leftover --v2-* values are inert under other themes.
        if (theme.uiV2) {
          for (const [name, value] of object.entries(theme.uiV2)) {
            document.documentElement.style.setProperty(`--v2-${kebabCase(name)}`, value);
          }
        }

        document.body.classList.toggle("ui-v2", Boolean(theme.uiV2));
      } catch (error) {
        logger.error("[THEME]: Failed to apply active theme", error);
        resetTheme();
      }
    };
  },
  causesSideEffects: true,
});

export default applyLensThemeInjectable;
