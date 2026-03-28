/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "@freelensapp/messaging";

/**
 * Channel to notify all renderer frames that theme preferences have changed.
 * Each frame should react by re-computing and applying its own activeTheme.
 * No payload is sent - frames derive the theme from their own state.
 */
export const themeChangedChannel: MessageChannel<void> = {
  id: "theme-changed",
};
