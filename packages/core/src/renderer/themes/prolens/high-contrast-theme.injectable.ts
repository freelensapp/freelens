/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "../declaration";
import { proLensThemes } from "./palettes";

import type { Injectable } from "@ogre-tools/injectable";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "../lens-theme";

// Annotated for declaration emit; see ../declaration.ts.
const highContrastThemeInjectable: Injectable<LensTheme, ReadonlyDeep<LensTheme>> = getInjectable({
  id: "prolens-theme-high-contrast",
  instantiate: () => proLensThemes.highContrast,
  injectionToken: lensThemeDeclarationInjectionToken,
});

export default highContrastThemeInjectable;
