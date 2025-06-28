/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { HttpsProxyAgent } from "hpagent";
import fetchInjectable from "../../common/fetch/node-fetch.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

import type { NodeFetch } from "../../common/fetch/node-fetch.injectable";

export type ProxyFetch = NodeFetch;

const proxyFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): ProxyFetch => {
    const fetch = di.inject(fetchInjectable);
    const logger = di.inject(loggerInjectionToken);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);

    return (url, init = {}) => {
      const { httpsProxy, allowUntrustedCAs } = userPreferencesState;
      let agent: HttpsProxyAgent | undefined;
      if (httpsProxy) {
        try {
          agent = new HttpsProxyAgent({
            proxy: httpsProxy,
            rejectUnauthorized: !allowUntrustedCAs,
          });
          logger.debug(`[PROXY-FETCH]: Uses proxy agent (${httpsProxy})`);
        } catch (error) {
          logger.error(`[PROXY-FETCH]: Proxy agent error (${httpsProxy}): ${error}`);
        }
      }

      return fetch(url, {
        agent,
        ...init,
      });
    };
  },
});

export default proxyFetchInjectable;
