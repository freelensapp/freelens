/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import applyLensThemeInjectable from "../../../../renderer/themes/apply-lens-theme.injectable";
import { activeThemeUpdateChannel } from "../common/channel";

const activeThemeUpdateListenerInjectable = getMessageChannelListenerInjectable({
  channel: activeThemeUpdateChannel,
  id: "renderer",
  getHandler: (di) => {
    const applyLensTheme = di.inject(applyLensThemeInjectable);

    return (theme) => {
      // Store theme globally in cluster frames for persistence
      if (!process.isMainFrame) {
        (window as any).__lastReceivedTheme = theme;
      }

      applyLensTheme(theme);
    };
  },
});

export default activeThemeUpdateListenerInjectable;
