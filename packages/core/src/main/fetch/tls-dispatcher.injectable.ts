/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "undici";
import { tlsDispatcherInjectionToken } from "../../common/fetch/tls-dispatcher-injection-token";
import type { ConnectionOptions } from "node:tls";

const tlsDispatcherInjectable = getInjectable({
  id: "tls-dispatcher",
  instantiate: () => (connect: ConnectionOptions) => new Agent({ connect }),
  injectionToken: tlsDispatcherInjectionToken,
});

export default tlsDispatcherInjectable;
