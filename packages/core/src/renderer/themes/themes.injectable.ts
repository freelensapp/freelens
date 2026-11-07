/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import customThemesLoaderInjectable from "./custom-themes-loader.injectable";

import type { Injectable } from "@ogre-tools/injectable";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

// Annotated for declaration emit; see ./declaration.ts.
const lensThemesInjectable: Injectable<Map<string, ReadonlyDeep<LensTheme>>> = getInjectable({
  id: "lens-themes",
  instantiate: (di) => {
    const builtInThemes = di.injectMany(lensThemeDeclarationInjectionToken);
    const loadCustomThemes = di.inject(customThemesLoaderInjectable);
    const customThemes = loadCustomThemes();

    // Combine built-in and custom themes
    const allThemes = [...builtInThemes, ...customThemes];

    return new Map(allThemes.map((theme) => [theme.name, theme]));
  },
});

export default lensThemesInjectable;
