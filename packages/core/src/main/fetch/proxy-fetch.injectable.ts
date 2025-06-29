/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import nodeFetch, { type RequestInfo, type RequestInit, type Response } from "@freelensapp/node-fetch";

export type NodeFetchRequestInfo = RequestInfo;
export type NodeFetchRequestInit = RequestInit;
export type NodeFetchResponse = Response;

export type NodeFetch = (url: URL | NodeFetchRequestInfo, init?: NodeFetchRequestInit) => Promise<NodeFetchResponse>;

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import httpsAgentInjectable from "./https-agent.injectable";

export type ProxyFetch = NodeFetch;

const proxyFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): ProxyFetch => {
    const httpsAgent = di.inject(httpsAgentInjectable);

    return async (url, init = {}) => {
      const agent = httpsAgent();

      return await nodeFetch(url, {
        agent,
        ...init,
      });
    };
  },
});

export default proxyFetchInjectable;
