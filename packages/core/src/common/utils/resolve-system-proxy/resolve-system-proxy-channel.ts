/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getRequestChannel } from "@freelens/messaging";

export const resolveSystemProxyChannel = getRequestChannel<string, string>(
  "resolve-system-proxy-channel",
);
