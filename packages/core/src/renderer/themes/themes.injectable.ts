/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import customThemesInjectable from "../../../features/user-preferences/common/custom-themes.injectable";

const lensThemesInjectable = getInjectable({
  id: "lens-themes",
  instantiate: (di) => {
    const builtinThemes = di.injectMany(lensThemeDeclarationInjectionToken);
    const customThemes = di.inject(customThemesInjectable);

    // Combine built-in themes with custom themes
    const allThemes = [...builtinThemes, ...Object.values(customThemes)];

    return new Map(allThemes.map((theme) => [theme.name, theme]));
  },
});

export default lensThemesInjectable;
