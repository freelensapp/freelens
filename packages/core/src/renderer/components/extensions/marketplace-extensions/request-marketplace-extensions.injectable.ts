/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) Maifee Ul Asad. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import extensionApiVersionInjectable from "../../../../common/vars/extension-api-version.injectable";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";
import marketplaceDownloadErrorInjectable from "./marketplace-download-error.injectable";
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
    const downloadError = di.inject(marketplaceDownloadErrorInjectable);
    // A refresh that fails keeps the list of the last download that succeeded.
    let lastList: MarketplaceExtension[] = [];

    const fail = (message: string) => {
      logger.warn(`Failed to download the marketplace: ${message}`);
      runInAction(() => downloadError.set(message));

      return lastList;
    };

    return async (): Promise<MarketplaceExtension[]> => {
      const result = await downloadJson(marketplaceExtensionListUrl, {
        timeout: 10_000,
      });

      if (!result.callWasSuccessful) {
        return fail(String(result.error));
      }

      try {
        lastList = parseMarketplaceExtensionList(result.response, {
          freelensVersion,
          listUrl: marketplaceExtensionListUrl,
        });
      } catch (error) {
        return fail(error instanceof Error ? error.message : String(error));
      }

      runInAction(() => downloadError.set(undefined));

      return lastList;
    };
  },

  causesSideEffects: true,
});

export default requestMarketplaceExtensionsInjectable;
