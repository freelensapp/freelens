/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "@freelensapp/messaging";

import type { ClusterId } from "../cluster-types";

export const clusterVisibilityChannel: MessageChannel<ClusterId | null> = {
  id: "cluster-visibility",
};
