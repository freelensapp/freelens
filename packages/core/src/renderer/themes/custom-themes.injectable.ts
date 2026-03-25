/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import customThemesInjectable from "../../features/user-preferences/common/custom-themes.injectable";

import type { LensTheme } from "./lens-theme";

const customLensThemesInjectable = getInjectable({
  id: "custom-lens-themes",
  instantiate: (di) => {
    const customThemesState = di.inject(customThemesInjectable);

    // Convert custom themes to LensTheme format
    const customThemes: LensTheme[] = customThemesState.themes.map((customTheme) => ({
      name: customTheme.name,
      type: customTheme.type,
      description: customTheme.description,
      author: customTheme.author,
      monacoTheme: customTheme.monacoTheme,
      colors: customTheme.colors,
      terminalColors: customTheme.terminalColors,
    }));

    return customThemes;
  },
  injectionToken: lensThemeDeclarationInjectionToken,
});

export default customLensThemesInjectable;
