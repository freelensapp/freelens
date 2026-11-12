/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { session } from "electron";

/**
 * Empties the local storage of the session every window uses, before any of
 * them loads. Every page of the renderer, and the extension code it runs, has
 * an origin that carries the port of the proxy, which changes on each run, so
 * what an earlier run stored there is never read again.
 */
const clearLocalStorageInjectable = getInjectable({
  id: "clear-local-storage",

  instantiate: (di) => ({
    run: async () => {
      const logger = di.inject(loggerInjectionToken);

      try {
        await session.defaultSession.clearData({ dataTypes: ["localStorage"] });
        logger.info("[LOCAL-STORAGE] Cleared the local storage of earlier runs");
      } catch (error) {
        logger.error("[LOCAL-STORAGE] Failed to clear the local storage of earlier runs", { error });
      }
    },
  }),

  causesSideEffects: true,

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default clearLocalStorageInjectable;
