/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";

export interface AccentColors {
  dark: string | undefined;
  light: string | undefined;
}

const accentColorsInjectable = getInjectable({
  id: "accent-colors",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(
      (): AccentColors => ({
        dark: state.accentColorDark,
        light: state.accentColorLight,
      }),
    );
  },
});

export default accentColorsInjectable;
