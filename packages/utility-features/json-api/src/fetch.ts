/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Dispatcher } from "undici";

/**
 * The request/response contract shared by both fetch implementations Freelens
 * runs.
 *
 * The two processes reach lens-proxy differently and cannot share one client:
 *
 * - the **renderer** uses Chromium's `fetch`. Its frame is served from
 *   `https://<clusterId>.renderer.freelens.app:<port>`, which Chromium's
 *   host-resolver rules map to 127.0.0.1 and whose certificate the session
 *   already trusts, so a request to the frame's own origin is routed to the
 *   right cluster by the `Host` header the browser sends on its own.
 * - the **main** process uses undici, because Node resolves no such hostname:
 *   it connects to 127.0.0.1 and has to carry the routing `Host` header
 *   itself, over a socket that trusts the lens-proxy certificate.
 *
 * Both are WHATWG `fetch`, so the DOM types describe them; `dispatcher` is the
 * one undici extension the main process needs, and is ignored by Chromium.
 */
export interface FetchRequestInit extends RequestInit {
  /** Main process only: the undici dispatcher to send this request through. */
  dispatcher?: Dispatcher;
}

export type FetchRequestInfo = RequestInfo;

export type FetchResponse = Response;

export type Fetch = (url: URL | FetchRequestInfo, init?: FetchRequestInit) => Promise<FetchResponse>;
