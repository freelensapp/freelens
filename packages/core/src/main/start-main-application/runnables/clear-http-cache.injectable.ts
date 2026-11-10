/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { session } from "electron";

/**
 * Empties the HTTP cache and the code cache of the session every window uses.
 * What earlier runs left there is never used again: the proxy listens on
 * another port on each run, which Chromium takes for another site, so both
 * caches only grow. Not awaited, so a large cache does not hold up the start.
 */
const clearHttpCacheInjectable = getInjectable({
  id: "clear-http-cache",

  instantiate: (di) => ({
    run: () => {
      const logger = di.inject(loggerInjectionToken);

      session.defaultSession.clearCache().then(
        () => logger.info("[HTTP-CACHE] Cleared the HTTP cache"),
        (error) => logger.error("[HTTP-CACHE] Failed to clear the HTTP cache", { error }),
      );
      session.defaultSession.clearCodeCaches({}).then(
        () => logger.info("[HTTP-CACHE] Cleared the code cache"),
        (error) => logger.error("[HTTP-CACHE] Failed to clear the code cache", { error }),
      );
    },
  }),

  causesSideEffects: true,

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default clearHttpCacheInjectable;
