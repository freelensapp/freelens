/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import initializeSystemThemeTypeInjectable from "../../features/theme/system-type/renderer/initialize.injectable";
import initUserStoreInjectable from "../../features/user-preferences/renderer/load-storage.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../before-frame-starts/tokens";
import activeThemeInjectable from "./active.injectable";
import applyLensThemeInjectable from "./apply-lens-theme.injectable";

const setupApplyActiveThemeInjectable = getInjectable({
  id: "setup-apply-active-theme",
  instantiate: (di) => ({
    run: () => {
      const activeTheme = di.inject(activeThemeInjectable);
      const applyLensTheme = di.inject(applyLensThemeInjectable);
      const state = di.inject(userPreferencesStateInjectable);

      reaction(() => activeTheme.get(), applyLensTheme, {
        fireImmediately: true,
      });

      // Re-apply theme when the accent color changes
      reaction(
        () => state.accentColor,
        () => applyLensTheme(activeTheme.get()),
        { fireImmediately: false },
      );
    },
    runAfter: [initializeSystemThemeTypeInjectable, initUserStoreInjectable],
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default setupApplyActiveThemeInjectable;
