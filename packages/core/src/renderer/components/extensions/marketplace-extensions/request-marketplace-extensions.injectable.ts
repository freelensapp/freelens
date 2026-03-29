/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) Maifee Ul Asad. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import downloadJsonViaChannelInjectable from "../../../fetch/download-json-via-channel-copy.injectable";

import type { MarketplaceExtension } from "./marketplace-extensions.injectable";

// todo: change to offficial url, once the MR is merged
// ref: https://github.com/freelensapp/freelens-marketplace/pull/1
const extensionListUrl =
  "https://raw.githubusercontent.com/maifeeulasad/freelens-marketplace/refs/heads/marketplace-v0/assets/extensions.json";

type MarketplacePackageStatus = "official" | "community";

interface MarketplacePackageFromApi {
  name: string;
  description: string;
  version: string;
  status: MarketplacePackageStatus;
}

interface MarketplacePackagesResponse {
  meta: {
    version: number;
  };
  packages: MarketplacePackageFromApi[];
}

// first change to lowercase then replace non-alphanumeric characters with underscores to create a id
const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "_");

const isMarketplacePackageStatus = (value: unknown): value is MarketplacePackageStatus =>
  value === "official" || value === "community";

const isMarketplacePackageFromApi = (value: unknown): value is MarketplacePackageFromApi => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.version === "string" &&
    isMarketplacePackageStatus(candidate.status)
  );
};

const toMarketplaceExtension = ({
  name,
  description,
  version,
  status,
}: MarketplacePackageFromApi): MarketplaceExtension => ({
  // id is computed from name and version to ensure uniqueness and stability across updates
  id: `${clean(name)}-${clean(version)}`,
  name,
  description,
  version,
  status,
});

const requestMarketplaceExtensionsInjectable = getInjectable({
  id: "request-marketplace-extensions",

  instantiate: (di) => {
    const downloadJson = di.inject(downloadJsonViaChannelInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (): Promise<MarketplaceExtension[]> => {
      const result = await downloadJson(extensionListUrl, {
        timeout: 10_000,
      });

      if (!result.callWasSuccessful) {
        logger.warn(`Failed to download marketplace extensions: ${result.error}`);

        return [];
      }

      const response = result.response as Partial<MarketplacePackagesResponse>;
      const packages = Array.isArray(response.packages) ? response.packages : [];

      return packages.filter(isMarketplacePackageFromApi).map(toMarketplaceExtension);
    };
  },

  causesSideEffects: true,
});

export default requestMarketplaceExtensionsInjectable;
