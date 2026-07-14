/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

export type CustomThemeColors = Partial<Record<string, string>>;

const customThemeColorsInjectable = getInjectable({
  id: "custom-theme-colors",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed((): CustomThemeColors => state.customThemeColors ?? {});
  },
});

export default customThemeColorsInjectable;
