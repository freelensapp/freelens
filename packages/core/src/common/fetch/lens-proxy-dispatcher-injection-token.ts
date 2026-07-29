/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { Dispatcher } from "undici";

/**
 * The dispatcher requests to lens-proxy are sent through, or `undefined` when
 * the process needs none.
 *
 * Main talks to lens-proxy over Node and has to be told to trust its
 * self-signed certificate. The renderer does not: the window's session already
 * verifies that certificate (`session-certificate-verifier.injectable.ts`), and
 * Chromium's fetch has no dispatchers to begin with.
 */
export const lensProxyDispatcherInjectionToken = getInjectionToken<() => Dispatcher | undefined>({
  id: "lens-proxy-dispatcher-token",
});
