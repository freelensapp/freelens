/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import { themeChangedChannel } from "../../features/theme/active-theme/common/channel";
import initializeSystemThemeTypeInjectable from "../../features/theme/system-type/renderer/initialize.injectable";
import initUserStoreInjectable from "../../features/user-preferences/renderer/load-storage.injectable";
import { beforeFrameStartsSecondInjectionToken } from "../before-frame-starts/tokens";
import activeThemeInjectable from "./active.injectable";
import applyLensThemeInjectable from "./apply-lens-theme.injectable";

/**
 * Sets up reactive theme application for all frames.
 *
 * Each frame (root and cluster) reacts to activeTheme changes independently.
 * The root frame broadcasts a "theme-changed" event (with no payload) to notify
 * cluster frames that preferences have changed - they then derive and apply
 * their own theme from their local state.
 */
const setupApplyActiveThemeInjectable = getInjectable({
  id: "setup-apply-active-theme",
  instantiate: (di) => ({
    run: () => {
      const activeTheme = di.inject(activeThemeInjectable);
      const applyLensTheme = di.inject(applyLensThemeInjectable);
      const broadcastMessage = di.inject(broadcastMessageInjectable);

      // All frames: react to activeTheme changes and apply theme
      reaction(
        () => activeTheme.get(),
        (theme) => {
          applyLensTheme(theme);

          // Root frame: notify cluster frames that theme preferences changed
          if (process.isMainFrame) {
            broadcastMessage(themeChangedChannel.id);
          }
        },
        { fireImmediately: true },
      );
    },
    runAfter: [initializeSystemThemeTypeInjectable, initUserStoreInjectable],
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default setupApplyActiveThemeInjectable;
