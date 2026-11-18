/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { defaultThemePreference, defaultThemeVariantPreference } from "../../../common/vars";
import userPreferencesStateInjectable from "./state.injectable";

import type { ThemeVariantPreference } from "./preferences-helpers";

export interface ThemePreference {
  /**
   * The `metadata.name` of the chosen theme.
   */
  name: string;
  variant: ThemeVariantPreference;
}

const themePreferenceInjectable = getInjectable({
  id: "theme-preference",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    return computed(
      // The defaults also cover the time before the preferences are loaded.
      (): ThemePreference => ({
        name: state.theme || defaultThemePreference,
        variant: state.themeVariant ?? defaultThemeVariantPreference,
      }),
      { equals: (a, b) => a.name === b.name && a.variant === b.variant },
    );
  },
});

export default themePreferenceInjectable;
