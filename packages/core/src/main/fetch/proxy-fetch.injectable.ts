/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetch as undiciFetch } from "undici";
import { withHostHeaderPreserved } from "./host-header-dispatcher";
import httpsAgentInjectable from "./https-agent.injectable";

import type { Fetch } from "@freelensapp/json-api";

import type { RequestInit as UndiciRequestInit, Response as UndiciResponse } from "undici";

export type ProxyFetch = Fetch;

const proxyFetchInjectable: Injectable<ProxyFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): ProxyFetch => {
    const httpsAgent = di.inject(httpsAgentInjectable);

    return async (url, init = {}) => {
      const response = await undiciFetch(
        url,
        withHostHeaderPreserved({
          dispatcher: httpsAgent(),
          ...init,
        }) as UndiciRequestInit,
      );

      return response as UndiciResponse as unknown as Response;
    };
  },
});

export default proxyFetchInjectable;
