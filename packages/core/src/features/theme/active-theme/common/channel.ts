/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "@freelensapp/messaging";
import type { LensTheme } from "../../../../renderer/themes/lens-theme";

export const activeThemeUpdateChannel: MessageChannel<LensTheme> = {
  id: "active-theme-update",
};
