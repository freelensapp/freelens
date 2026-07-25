/**
 * Copyright (c) Freelens Authors. All rights reserved.
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

        // `resolveProxy` returns a PAC-format string (e.g. "DIRECT" or "PROXY host:port; DIRECT").
        // It cannot be fed directly into `setProxy` with `mode: "fixed_servers"`, whose `proxyRules`
        // expects server specs like "host:port" or "https=host:port". Passing "DIRECT" there makes
        // Chromium route all non-local traffic through a phantom proxy named "DIRECT", which breaks
        // every external request with ERR_PROXY_CONNECTION_FAILED.
        const pacResult = await session.defaultSession.resolveProxy("https://example.com");

        const proxyRules = pacResult
          .split(";")
          .map((entry) => entry.trim())
          .filter((entry) => entry && entry.toUpperCase() !== "DIRECT")
          .map((entry) =>
            entry
              .replace(/^PROXY\s+/i, "")
              .replace(/^HTTPS\s+/i, "https://")
              .replace(/^SOCKS5\s+/i, "socks5://")
              .replace(/^SOCKS4\s+/i, "socks4://")
              .replace(/^SOCKS\s+/i, "socks://"),
          )
          .join(",");

        if (proxyRules === "") {
          // No system proxy — connect directly so external requests are not routed through a proxy.
          await session.defaultSession.setProxy({ mode: "direct" });

          logger.info("[PROXY-BYPASS] No system proxy detected; using direct connection");
        } else {
          await session.defaultSession.setProxy({
            mode: "fixed_servers",
            proxyRules,
            proxyBypassRules: [
              "<local>",
              "renderer.freelens.app",
              ".renderer.freelens.app",
              "127.0.0.1/8",
              "[::1]",
            ].join(","),
          });

          logger.info("[PROXY-BYPASS] Proxy bypass configured for local addresses while preserving system proxy");
        }
      } catch (error) {
        logger.error("[PROXY-BYPASS] Failed to configure session proxy bypass", { error });
      }
    },
  }),

  causesSideEffects: true,

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default setupSessionProxyBypassInjectable;
