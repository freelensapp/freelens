/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { Fetch } from "@freelensapp/json-api";

/**
 * The process-specific `fetch` implementation: Chromium's in the renderer,
 * undici's in main. See {@link Fetch} for why the two cannot be the same.
 *
 * Inject {@link fetchInjectable} rather than this token — it is the stable
 * surface tests override.
 */
export const fetchImplementationInjectionToken = getInjectionToken<Fetch>({
  id: "fetch-implementation-token",
});
