/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getMessageChannel, getRequestChannel } from "@freelensapp/messaging";

export const syncBoxChannel = getMessageChannel<{ id: string; value: any }>("sync-box-channel");

export const syncBoxInitialValueChannel = getRequestChannel<void, { id: string; value: any }[]>(
  "sync-box-initial-value-channel",
);
