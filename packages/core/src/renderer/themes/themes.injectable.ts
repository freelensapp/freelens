/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";

const lensThemesInjectable = getInjectable({
  id: "lens-themes",
  instantiate: (di) => {
    const builtInThemes = di.injectMany(lensThemeDeclarationInjectionToken);
    const state = di.inject(userPreferencesStateInjectable);

    return computed(() => {
      const allThemes = [...builtInThemes, ...state.customThemes];

      return new Map(allThemes.map((theme) => [theme.name, theme]));
    });
  },
});

export default lensThemesInjectable;
