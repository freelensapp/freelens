/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "@freelensapp/messaging";

export type ReloadPageChannel = MessageChannel<void>;

export const reloadPageChannel: ReloadPageChannel = {
  id: "reload-page-channel",
};
