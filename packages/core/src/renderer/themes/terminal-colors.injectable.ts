/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import findThemeInjectable from "../../features/theme/files/renderer/find-theme.injectable";
import resolveThemeInjectable from "../../features/theme/files/renderer/resolve-theme.injectable";
import terminalThemePreferenceInjectable from "../../features/user-preferences/common/terminal-theme.injectable";
import activeThemeInjectable from "./active.injectable";

import type { ReadonlyDeep } from "@freelensapp/type-fest";

import type { Injectable } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "./lens-theme";

/**
 * The colors of the terminal: those of the active theme, or of the chosen terminal theme in its
 * variant. A terminal theme that no longer exists gives the built-in theme.
 */
// Annotated for declaration emit; see ../../extensions/renderer-api/theming.ts.
const xtermColorThemeInjectable: Injectable<IComputedValue<ReadonlyDeep<LensTheme["terminalColors"]>>> = getInjectable({
  id: "terminal-colors",
  instantiate: (di) => {
    const activeTheme = di.inject(activeThemeInjectable);
    const terminalThemePreference = di.inject(terminalThemePreferenceInjectable);
    const findTheme = di.inject(findThemeInjectable);
    const resolveTheme = di.inject(resolveThemeInjectable);

    return computed(() => {
      const themePref = terminalThemePreference.get();

      if (themePref.matchLensTheme) {
        return activeTheme.get().terminalColors;
      }

      return resolveTheme(findTheme(themePref.themeName), themePref.variant).terminalColors;
    });
  },
});

export default xtermColorThemeInjectable;
