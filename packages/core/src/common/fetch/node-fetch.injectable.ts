/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetch as undiciFetch } from "undici";
import { withHostHeaderPreserved } from "./host-header-dispatcher";

import type { RequestInfo, RequestInit, Response } from "undici";

export type FetchRequestInfo = RequestInfo;
export type FetchRequestInit = RequestInit;
export type FetchResponse = Response;

export type NodeFetch = (url: URL | FetchRequestInfo, init?: FetchRequestInit) => Promise<FetchResponse>;

/**
 * undici's `fetch` rather than the renderer's Chromium `fetch`: requests to
 * lens-proxy carry a `Host` header, which Chromium refuses to send. See
 * {@link withHostHeaderPreserved}.
 */
const nodeFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "node-fetch",
  instantiate: () => (url, init) => undiciFetch(url, withHostHeaderPreserved(init)),
});

export default nodeFetchInjectable;
