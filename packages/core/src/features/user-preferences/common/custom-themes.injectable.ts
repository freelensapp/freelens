/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

import type { LensTheme } from "../../../renderer/themes/lens-theme";

export type CustomThemeMap = Record<string, LensTheme>;

const customThemesInjectable = getInjectable({
  id: "custom-themes",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed((): CustomThemeMap => {
      return state.customThemes || {};
    });
  },
});

export default customThemesInjectable;