/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IncomingHttpHeaders } from "node:http";

/**
 * The hosts freelens-proxy is reached under: `127.0.0.1` for kubectl, helm, the
 * terminals and the main process, and the root and cluster frames under
 * `renderer.freelens.app` and its subdomains. The port is not checked.
 */
const allowedHost = /^(?:127\.0\.0\.1|(?:[a-z0-9-]+\.)?renderer\.freelens\.app)(?::\d+)?$/;

/**
 * The origins of the frames: the root and the cluster frames. Requests from a
 * page carry an `Origin`; a request without one does not come from a page.
 */
const allowedOrigin = /^https:\/\/(?:[a-z0-9-]+\.)?renderer\.freelens\.app(?::\d+)?$/;

const authorityOf = (headers: IncomingHttpHeaders): string | undefined => {
  const authority = headers[":authority"] ?? headers.host;

  return typeof authority === "string" ? authority : undefined;
};

/**
 * Whether the `Host` / `:authority` of the request is one freelens-proxy serves.
 * A request to any other host is refused. This is a layer behind the token, not
 * a replacement for it.
 */
export const hasAllowedHost = (headers: IncomingHttpHeaders): boolean => {
  const authority = authorityOf(headers);

  return authority !== undefined && allowedHost.test(authority);
};

/**
 * Whether the request carries no `Origin`, or one of a Freelens frame. A
 * request with any other `Origin` is refused. This is a layer behind the
 * `SameSite=Strict` cookie; CLI clients send no `Origin` and pass.
 */
export const hasAllowedOrigin = (headers: IncomingHttpHeaders): boolean => {
  const origin = headers.origin;

  return origin === undefined || (typeof origin === "string" && allowedOrigin.test(origin));
};
