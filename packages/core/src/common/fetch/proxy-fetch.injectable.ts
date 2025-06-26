/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { HttpsProxyAgent } from "hpagent";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import fetchInjectable from "./node-fetch.injectable";

import type { NodeFetch } from "./node-fetch.injectable";

const proxyFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): NodeFetch => {
    const fetch = di.inject(fetchInjectable);
    const { httpsProxy, allowUntrustedCAs } = di.inject(userPreferencesStateInjectable);
    const agent = httpsProxy
      ? new HttpsProxyAgent({
          proxy: httpsProxy,
          rejectUnauthorized: !allowUntrustedCAs,
        })
      : undefined;

    return (url, init = {}) =>
      fetch(url, {
        agent,
        ...init,
      });
  },
});

export default proxyFetchInjectable;
