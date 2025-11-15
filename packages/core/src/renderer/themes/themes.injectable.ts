/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import customThemesStorageInjectable from "./custom-themes-storage.injectable";

const lensThemesInjectable = getInjectable({
  id: "lens-themes",
  instantiate: (di) => {
    const builtInThemes = di.injectMany(lensThemeDeclarationInjectionToken);
    const customThemesStorage = di.inject(customThemesStorageInjectable);

    return computed(() => {
      const allThemes = [...builtInThemes, ...customThemesStorage.themes];
      return new Map(allThemes.map((theme) => [theme.name, theme]));
    });
  },
});

export default lensThemesInjectable;
