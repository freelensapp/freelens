/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { normalizeAppearancePreferences } from "../../features/theme/customization/common/appearance";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import initUserStoreInjectable from "../../features/user-preferences/renderer/load-storage.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../before-frame-starts/tokens";

import type { AppearancePreferences } from "../../features/theme/customization/common/appearance";

export const applyAppearance = (root: HTMLElement, appearance: AppearancePreferences) => {
  root.dataset.density = appearance.density;
  root.style.setProperty("--font-size", `${appearance.fontSize}px`);
  root.style.setProperty("--font-size-small", `${appearance.fontSize - 2}px`);
  root.style.setProperty("--font-size-big", `${appearance.fontSize + 2}px`);
};

/**
 * Applies the density and font size preferences to this frame, and keeps
 * them applied as they change. The accent colour is part of the active theme.
 */
const setupApplyAppearanceInjectable = getInjectable({
  id: "setup-apply-appearance",
  instantiate: (di) => ({
    run: () => {
      const state = di.inject(userPreferencesStateInjectable);

      reaction(
        () => normalizeAppearancePreferences(state.appearance),
        (appearance) => applyAppearance(document.documentElement, appearance),
        { fireImmediately: true, equals: (left, right) => JSON.stringify(left) === JSON.stringify(right) },
      );
    },
    runAfter: [initUserStoreInjectable],
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default setupApplyAppearanceInjectable;
