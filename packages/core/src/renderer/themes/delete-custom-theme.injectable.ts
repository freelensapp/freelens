/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { defaultThemeId } from "../../common/vars";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { LensTheme } from "./lens-theme";

export type DeleteCustomTheme = (themeName: string) => void;

const deleteCustomThemeInjectable = getInjectable({
  id: "delete-custom-theme",
  instantiate: (di: DiContainer): DeleteCustomTheme => {
    const state = di.inject(userPreferencesStateInjectable);

    return (themeName: string) => {
      const customThemes = state.customThemes.filter((theme: LensTheme) => theme.name !== themeName);

      state.customThemes = customThemes;

      // If the deleted theme was active, reset to default
      if (state.colorTheme === themeName) {
        state.colorTheme = defaultThemeId;
      }
    };
  },
});

export default deleteCustomThemeInjectable;
