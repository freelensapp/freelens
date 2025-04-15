/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel, RequestChannel } from "@freelensapp/messaging";

export type SystemThemeType = "dark" | "light";

export const initialSystemThemeTypeChannel: RequestChannel<void, SystemThemeType> = {
  id: "initial-system-theme-type",
};

export const systemThemeTypeUpdateChannel: MessageChannel<SystemThemeType> = {
  id: "system-theme-type-update",
};
