/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";

import type { Injectable } from "@ogre-tools/injectable";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

// Annotated for declaration emit; see ./declaration.ts.
const defaultLensThemeInjectable: Injectable<ReadonlyDeep<LensTheme>> = getInjectable({
  id: "default-lens-theme",
  instantiate: (di) => {
    const themes = di.injectMany(lensThemeDeclarationInjectionToken);
    const [defaultTheme, ...rest] = themes.filter((theme) => theme.isDefault);

    if (rest.length > 0) {
      throw new Error("Multiple Freelens Theme's are declared as the default");
    }

    if (!defaultTheme) {
      throw new Error("No Freelens Theme is declared as the default");
    }

    return defaultTheme;
  },
});

export default defaultLensThemeInjectable;
