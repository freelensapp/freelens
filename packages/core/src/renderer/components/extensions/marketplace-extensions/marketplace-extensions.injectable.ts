/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "../../../../common/utils/async-computed";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

export type MarketplaceExtensionTier = "official" | "community";

/**
 * A person, as in the people fields of `package.json`.
 */
export interface MarketplaceExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * An item of `spec.versions`. Without `url` it is installed from npm as
 * `<package>@<version>`; with it, from that tarball, checked against
 * `integrity`.
 */
export interface MarketplaceExtensionVersion {
  version: string;
  freelens: string;
  url?: string;
  integrity?: string;
}

export interface MarketplaceExtension {
  /**
   * `metadata.name` of the entry.
   */
  id: string;
  /**
   * `spec.package`, the `name` of the `package.json`, by which installed
   * extensions are matched.
   */
  packageName: string;
  displayName: string;
  summary: string;
  description?: string;
  tier: MarketplaceExtensionTier;
  /**
   * The newest item of `spec.versions` whose range matches the running
   * Freelens.
   */
  version: MarketplaceExtensionVersion;
  homepage?: string;
  repository?: string;
  license?: string;
  /**
   * `spec.icon` resolved against the URL of the list.
   */
  iconUrl?: string;
  authors: MarketplaceExtensionAuthor[];
}

const marketplaceExtensionsInjectable = getInjectable({
  id: "marketplace-extensions",

  instantiate: (di) =>
    asyncComputed({
      getValueFromObservedPromise: di.inject(requestMarketplaceExtensionsInjectable),
      valueWhenPending: [],
      // A refresh keeps the cards that are shown until the new list is in.
      betweenUpdates: "show-latest-value",
    }),
});

export default marketplaceExtensionsInjectable;
