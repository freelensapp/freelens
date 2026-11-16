/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

import type { TerminalThemeVariantPreference } from "./preferences-helpers";

export type TerminalThemePreference =
  | {
      matchLensTheme: true;
    }
  | {
      matchLensTheme: false;
      /**
       * The `metadata.name` of the theme.
       */
      themeName: string;
      variant: TerminalThemeVariantPreference;
    };

const terminalThemePreferenceInjectable = getInjectable({
  id: "terminal-theme-preference",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed((): TerminalThemePreference => {
      // An empty terminal theme matches the theme of the application.
      if (!state.terminalTheme) {
        return {
          matchLensTheme: true,
        };
      }

      return {
        matchLensTheme: false,
        themeName: state.terminalTheme,
        variant: state.terminalThemeVariant ?? "dark",
      };
    });
  },
});

export default terminalThemePreferenceInjectable;
