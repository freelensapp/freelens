/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "https";
import lensProxyCertificateInjectable from "../../../common/certificate/lens-proxy-certificate.injectable";
import nodeFetchInjectable from "../../../common/fetch/node-fetch.injectable";
import isProductionInjectable from "../../../common/vars/is-production.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import { buildVersionInitializationInjectable } from "../../../features/vars/build-version/main/init.injectable";
import forceAppExitInjectable from "../../electron-app/features/force-app-exit.injectable";
import showErrorPopupInjectable from "../../electron-app/features/show-error-popup.injectable";
import lensProxyInjectable from "../../lens-proxy/lens-proxy.injectable";
import lensProxyPortInjectable from "../../lens-proxy/lens-proxy-port.injectable";

const setupLensProxyInjectable = getInjectable({
  id: "setup-lens-proxy",

  instantiate: (di) => ({
    run: async () => {
      const lensProxy = di.inject(lensProxyInjectable);
      const forceAppExit = di.inject(forceAppExitInjectable);
      const logger = di.inject(loggerInjectionToken);
      const lensProxyPort = di.inject(lensProxyPortInjectable);
      const isWindows = di.inject(isWindowsInjectable);
      const showErrorPopup = di.inject(showErrorPopupInjectable);
      const buildVersion = di.inject(buildVersionInitializable.stateToken);
      const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);
      const fetch = di.inject(nodeFetchInjectable);
      const isProduction = di.inject(isProductionInjectable);

      try {
        logger.info("🔌 Starting Freelens Proxy");
        await lensProxy.listen(); // lensProxy.port available
      } catch (error: any) {
        showErrorPopup("Freelens Error", `Could not start proxy: ${error?.message || "unknown error"}`);

        return forceAppExit();
      }

      // test proxy connection
      try {
        logger.info("🔎 Testing Freelens Proxy connection ...");
        const versionResponse = await fetch(`https://127.0.0.1:${lensProxyPort.get()}/version`, {
          agent: new Agent({
            ca: lensProxyCertificate.get()?.cert,
          }),
        });

        const { version: versionFromProxy } = (await versionResponse.json()) as { version: string };

        if (buildVersion !== versionFromProxy) {
          logger.error("Proxy server responded with invalid response");

          return forceAppExit();
        }

        logger.info("⚡ Freelens Proxy connection OK");
      } catch (error) {
        logger.error(`🛑 Freelens Proxy: failed connection test: ${error}`);

        const hostsPath = isWindows ? "C:\\windows\\system32\\drivers\\etc\\hosts" : "/etc/hosts";
        const message = [
          `Failed connection test: ${error}`,
          "Check to make sure that no other versions of Freelens are running",
          `Check ${hostsPath} to make sure that it is clean and that the localhost loopback is at the top and set to 127.0.0.1`,
          "If you have HTTP_PROXY or http_proxy set in your environment, make sure that the localhost and the ipv4 loopback address 127.0.0.1 are added to the NO_PROXY environment variable.",
        ];

        showErrorPopup("Freelens Proxy Error", message.join("\n\n"));

        return forceAppExit();
      }

      // Wait for the renderer route to be ready (prevents ERR_EMPTY_RESPONSE race condition)
      const maxAttempts = 30;
      const retryDelayMs = 200;
      const testPath = isProduction ? "/" : "/build/index.html";

      logger.info(`🔧 Waiting for renderer route to be ready (${testPath})...`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Test the actual route that the window will load
          const response = await fetch(`https://127.0.0.1:${lensProxyPort.get()}${testPath}`, {
            method: "HEAD",
            agent: new Agent({
              ca: lensProxyCertificate.get()?.cert,
            }),
            signal: AbortSignal.timeout(2000),
          });

          if (response.ok) {
            logger.info("⚡ Renderer route is ready");
            break;
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error: any) {
          if (attempt < maxAttempts) {
            logger.info(
              `🔧 Renderer route not ready yet (attempt ${attempt}/${maxAttempts}): ${error.message}, retrying in ${retryDelayMs}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          } else {
            logger.warn(
              `⚠️  Renderer route did not respond after ${maxAttempts} attempts (${error.message}). Window may fail to load initially.`,
            );
          }
        }
      }
    },
    runAfter: buildVersionInitializationInjectable,
  }),

  causesSideEffects: true,

  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default setupLensProxyInjectable;
