/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";
import type { ConnectionOptions } from "node:tls";

import type { Dispatcher } from "undici";

/**
 * Builds a dispatcher that connects with the given TLS options — a custom CA,
 * a client certificate, or no verification at all.
 *
 * Returns `undefined` in the renderer, which has no dispatchers: Chromium owns
 * the TLS handshake there, so a remote cluster that needs any of these options
 * can only be reached from the main process.
 */
export const tlsDispatcherInjectionToken = getInjectionToken<(options: ConnectionOptions) => Dispatcher | undefined>({
  id: "tls-dispatcher-token",
});
