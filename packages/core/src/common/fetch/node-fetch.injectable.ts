/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import nodeFetch, { type RequestInit, type Response } from "@freelensapp/node-fetch";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";

export type NodeFetch = typeof nodeFetch;
export type NodeFetchRequestInit = RequestInit;
export type NodeFetchResponse = Response;

export type { RequestInit, Response } from "@freelensapp/node-fetch";

const nodeFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "node-fetch",
  instantiate: (di) => nodeFetch,
  causesSideEffects: true,
});

export default nodeFetchInjectable;
