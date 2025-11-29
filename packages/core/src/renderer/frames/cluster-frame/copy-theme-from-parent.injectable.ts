/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { beforeClusterFrameStartsFirstInjectionToken } from "../../before-frame-starts/tokens";
import applyLensThemeInjectable from "../../themes/apply-lens-theme.injectable";

/**
 * Ensures cluster frames preserve theme CSS variables by:
 * 1. Storing the last received theme in a global variable
 * 2. Reapplying it when the document is ready
 * 3. Watching for potential CSS variable resets with delayed reapplication
 */
const ensureThemeReadyInjectable = getInjectable({
  id: "ensure-theme-ready-in-cluster-frame",
  instantiate: (di) => ({
    run: () => {
      const applyLensTheme = di.inject(applyLensThemeInjectable);

      // Store the last received theme globally in the iframe
      // This will be set by the update listener
      (window as any).__lastReceivedTheme = null;

      // Function to apply stored theme
      const applyStoredTheme = () => {
        const theme = (window as any).__lastReceivedTheme;
        if (theme) {
          applyLensTheme(theme);
        }
      };

      // Apply theme when document is fully ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyStoredTheme);
      }

      // Watch for potential CSS variable resets
      // Some frameworks might clear styles, so we reapply after delays
      setTimeout(() => {
        const primaryVar = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary')
          .trim();

        if (!primaryVar && (window as any).__lastReceivedTheme) {
          applyStoredTheme();
        }
      }, 200);

      setTimeout(() => {
        const primaryVar = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary')
          .trim();

        if (!primaryVar && (window as any).__lastReceivedTheme) {
          applyStoredTheme();
        }
      }, 500);
    },
  }),
  injectionToken: beforeClusterFrameStartsFirstInjectionToken,
});

export default ensureThemeReadyInjectable;
