/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel } from "@freelensapp/messaging";

/**
 * Sent by main to every frame after a Helm repository is added or removed.
 */
export const helmRepositoriesChangedChannel: MessageChannel<void> = {
  id: "helm-repositories-changed",
};
