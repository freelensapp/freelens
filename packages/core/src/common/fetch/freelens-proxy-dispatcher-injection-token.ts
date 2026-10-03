/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { Dispatcher } from "undici";

/**
 * The dispatcher requests to freelens-proxy are sent through, or `undefined` when
 * the process needs none.
 *
 * Main talks to freelens-proxy over Node and has to be told to trust its
 * self-signed certificate. The renderer does not: the window's session already
 * verifies that certificate (`session-certificate-verifier.injectable.ts`), and
 * Chromium's fetch has no dispatchers to begin with.
 */
export const freelensProxyDispatcherInjectionToken = getInjectionToken<() => Dispatcher | undefined>({
  id: "freelens-proxy-dispatcher-token",
});
