/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { resolveCustomTheme } from "./prolens/custom-themes";
import lensThemesInjectable from "./themes.injectable";

import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

export interface ThemeWithOrigin {
  theme: ReadonlyDeep<LensTheme>;
  isCustom: boolean;
}

/**
 * Built-in themes followed by the user's custom themes, by name.
 */
const allLensThemesInjectable = getInjectable({
  id: "all-lens-themes",
  instantiate: (di): IComputedValue<Map<string, ThemeWithOrigin>> => {
    const builtIns = di.inject(lensThemesInjectable);
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => {
      const themes = new Map<string, ThemeWithOrigin>();

      for (const [name, theme] of builtIns) {
        themes.set(name, { theme, isCustom: false });
      }

      for (const definition of state.customThemes ?? []) {
        const theme = resolveCustomTheme(definition, builtIns);

        if (theme && !themes.has(theme.name)) {
          themes.set(theme.name, { theme, isCustom: true });
        }
      }

      return themes;
    });
  },
});

export default allLensThemesInjectable;
