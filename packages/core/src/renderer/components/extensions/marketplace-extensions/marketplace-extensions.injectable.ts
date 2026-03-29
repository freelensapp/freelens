/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import requestMarketplaceExtensionsInjectable from "./request-marketplace-extensions.injectable";

export interface MarketplaceExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "official" | "community";
  author?: string;
  downloads?: number;
}

const marketplaceExtensionsInjectable = getInjectable({
  id: "marketplace-extensions",

  instantiate: (di) =>
    asyncComputed({
      getValueFromObservedPromise: di.inject(requestMarketplaceExtensionsInjectable),
      valueWhenPending: [],
    }),
});

export default marketplaceExtensionsInjectable;
