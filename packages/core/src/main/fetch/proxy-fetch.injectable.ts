/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetch as undiciFetch } from "undici";
import { withHostHeaderPreserved } from "../../common/fetch/host-header-dispatcher";
import httpsAgentInjectable from "./https-agent.injectable";

import type { NodeFetch } from "../../common/fetch/node-fetch.injectable";

export type ProxyFetch = NodeFetch;

const proxyFetchInjectable: Injectable<ProxyFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): ProxyFetch => {
    const httpsAgent = di.inject(httpsAgentInjectable);

    return async (url, init = {}) =>
      await undiciFetch(
        url,
        withHostHeaderPreserved({
          dispatcher: httpsAgent(),
          ...init,
        }),
      );
  },
});

export default proxyFetchInjectable;
