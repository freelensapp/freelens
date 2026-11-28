/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) Maifee Ul Asad. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import extensionApiVersionInjectable from "../../../../common/vars/extension-api-version.injectable";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";
import { parseMarketplaceExtensionList } from "./parse-marketplace-extension-list";

import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

const marketplaceExtensionListUrl =
  "https://raw.githubusercontent.com/freelensapp/freelens-marketplace/refs/heads/main/extensions.json";

const requestMarketplaceExtensionsInjectable = getInjectable({
  id: "request-marketplace-extensions",

  instantiate: (di) => {
    const downloadJson = di.inject(downloadJsonViaChannelInjectable);
    const freelensVersion = di.inject(extensionApiVersionInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (): Promise<MarketplaceExtension[]> => {
      const result = await downloadJson(marketplaceExtensionListUrl, {
        timeout: 10_000,
      });

      if (!result.callWasSuccessful) {
        logger.warn(`Failed to download marketplace extensions: ${result.error}`);

        return [];
      }

      try {
        return parseMarketplaceExtensionList(result.response, {
          freelensVersion,
          listUrl: marketplaceExtensionListUrl,
        });
      } catch (error) {
        logger.warn(`Failed to read marketplace extensions: ${error}`);

        return [];
      }
    };
  },

  causesSideEffects: true,
});

export default requestMarketplaceExtensionsInjectable;
