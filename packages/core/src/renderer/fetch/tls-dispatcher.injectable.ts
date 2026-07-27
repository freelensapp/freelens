/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { tlsDispatcherInjectionToken } from "../../common/fetch/tls-dispatcher-injection-token";

/**
 * None: Chromium owns the TLS handshake in the renderer and its `fetch` takes
 * no dispatcher, so a remote cluster needing a custom CA or a client
 * certificate has to be reached from the main process.
 */
const tlsDispatcherInjectable = getInjectable({
  id: "tls-dispatcher",
  instantiate: () => () => undefined,
  injectionToken: tlsDispatcherInjectionToken,
});

export default tlsDispatcherInjectable;
