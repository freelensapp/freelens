/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import nodeFetch, { type RequestInfo, type RequestInit, type Response } from "node-fetch";

export type NodeFetchRequestInfo = RequestInfo;
export type NodeFetchRequestInit = RequestInit;
export type NodeFetchResponse = Response;

export type NodeFetch = (url: URL | NodeFetchRequestInfo, init?: NodeFetchRequestInit) => Promise<NodeFetchResponse>;

const nodeFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "node-fetch",
  instantiate: (di) => (url, init) => {
    return nodeFetch(url, init);
  },
});

export default nodeFetchInjectable;
