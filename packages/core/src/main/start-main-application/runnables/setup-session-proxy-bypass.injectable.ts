/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { session } from "electron";

const setupSessionProxyBypassInjectable = getInjectable({
  id: "setup-session-proxy-bypass",

  instantiate: (di) => ({
    run: async () => {
      const logger = di.inject(loggerInjectionToken);

      try {
        logger.info("[PROXY-BYPASS] Configuring session proxy bypass for localhost connections");

        const systemProxyRules = await session.defaultSession.resolveProxy("https://example.com");

        await session.defaultSession.setProxy({
          mode: "fixed_servers",
          proxyRules: systemProxyRules,
          proxyBypassRules: [
            "<local>",
            "renderer.freelens.app",
            ".renderer.freelens.app",
            "127.0.0.1/8",
            "[::1]",
          ].join(","),
        });

        logger.info("[PROXY-BYPASS] Proxy bypass configured for local addresses while preserving system proxy");
      } catch (error) {
        logger.error("[PROXY-BYPASS] Failed to configure session proxy bypass", { error });
      }
    },
  }),

  causesSideEffects: true,

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default setupSessionProxyBypassInjectable;
