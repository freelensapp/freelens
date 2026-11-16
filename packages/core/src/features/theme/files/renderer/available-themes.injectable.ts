/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { builtInThemes } from "../common/builtin-theme";
import importedThemesStateInjectable from "./imported-themes-state.injectable";

import type { IComputedValue } from "mobx";

import type { ThemeFile } from "../common/schema";

export interface AvailableTheme {
  theme: ThemeFile;
  isBuiltIn: boolean;
  /**
   * The file of an imported theme in the themes directory.
   */
  fileName?: string;
  unknownTokens: string[];
}

const builtIn: AvailableTheme[] = builtInThemes.map(({ theme }) => ({ theme, isBuiltIn: true, unknownTokens: [] }));

/**
 * Every theme the user can choose: the built-in ones first, the default theme leading, then the
 * imported ones by name.
 */
const availableThemesInjectable = getInjectable({
  id: "available-themes",
  instantiate: (di): IComputedValue<AvailableTheme[]> => {
    const state = di.inject(importedThemesStateInjectable);

    return computed(() => [
      ...builtIn,
      ...state
        .get()
        .themes.map(({ theme, fileName, unknownTokens }) => ({ theme, fileName, unknownTokens, isBuiltIn: false }))
        .sort((a, b) => a.theme.spec.displayName.localeCompare(b.theme.spec.displayName)),
    ]);
  },
});

export default availableThemesInjectable;
