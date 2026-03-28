/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import activeThemeInjectable from "../../../../renderer/themes/active.injectable";
import applyLensThemeInjectable from "../../../../renderer/themes/apply-lens-theme.injectable";
import { themeChangedChannel } from "../common/channel";

/**
 * Listens for theme-changed events and reacts by computing and applying
 * the theme from local state. This is the reactive pattern where each
 * frame derives its own theme instead of receiving a pushed theme object.
 */
const themeChangedListenerInjectable = getMessageChannelListenerInjectable({
  channel: themeChangedChannel,
  id: "renderer",
  getHandler: (di) => {
    const activeTheme = di.inject(activeThemeInjectable);
    const applyLensTheme = di.inject(applyLensThemeInjectable);

    return () => {
      // Derive theme from local state and apply it
      const theme = activeTheme.get();

      applyLensTheme(theme);
    };
  },
});

export default themeChangedListenerInjectable;
