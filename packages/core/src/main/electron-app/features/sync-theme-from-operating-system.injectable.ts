/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getStartableStoppable } from "@freelensapp/startable-stoppable";
import { getInjectable } from "@ogre-tools/injectable";
import operatingSystemThemeStateInjectable from "../../theme/operating-system-theme-state.injectable";
import getElectronThemeInjectable from "./get-electron-theme.injectable";
import nativeThemeInjectable from "./native-theme.injectable";

const syncThemeFromOperatingSystemInjectable = getInjectable({
  id: "sync-theme-from-operating-system",

  instantiate: (di) => {
    const currentThemeState = di.inject(operatingSystemThemeStateInjectable);
    const nativeTheme = di.inject(nativeThemeInjectable);
    const getElectronTheme = di.inject(getElectronThemeInjectable);

    return getStartableStoppable("sync-theme-from-operating-system", () => {
      const updateThemeState = () => {
        currentThemeState.set(getElectronTheme());
      };

      nativeTheme.on("updated", updateThemeState);

      return () => {
        nativeTheme.off("updated", updateThemeState);
      };
    });
  },
});

export default syncThemeFromOperatingSystemInjectable;
