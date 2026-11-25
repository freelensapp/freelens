/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

/**
 * The cookie the cluster frames carry the token in. A terminal, kubectl, helm
 * and the main process carry it as `Authorization: Bearer` instead, which a
 * browser cannot add to a frame's own requests.
 */
export const freelensProxyTokenCookie = "freelens_proxy_token";

/**
 * The environment variable the `credential` subcommand of freelens-k8s-proxy
 * reads, named in the `exec` user of the proxy kubeconfig. Freelens sets it on
 * every kubectl, helm and terminal it starts against the proxy, so each sends
 * the token as `Authorization: Bearer` without the kubeconfig holding it.
 */
export const freelensProxyTokenEnvVar = "FREELENS_PROXY_TOKEN";

const bearerPrefix = "Bearer ";

function bearerToken(headers: IncomingHttpHeaders): string | undefined {
  const authorization = headers.authorization;

  if (typeof authorization === "string" && authorization.startsWith(bearerPrefix)) {
    return authorization.slice(bearerPrefix.length);
  }

  return undefined;
}

function cookieToken(headers: IncomingHttpHeaders): string | undefined {
  // Over HTTP/2 the cookie may arrive split into several `cookie` fields
  const cookieHeader = headers.cookie;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : cookieHeader ? [cookieHeader] : [];

  for (const cookie of cookies) {
    for (const pair of cookie.split(";")) {
      const index = pair.indexOf("=");

      if (index > 0 && pair.slice(0, index).trim() === freelensProxyTokenCookie) {
        return pair.slice(index + 1).trim();
      }
    }
  }

  return undefined;
}

/**
 * The token a request carries, from the `Authorization: Bearer` header or, for
 * a cluster frame, from the cookie.
 */
export function tokenFromHeaders(headers: IncomingHttpHeaders): string | undefined {
  return bearerToken(headers) ?? cookieToken(headers);
}

/**
 * Removes the token from the request before it is forwarded to
 * freelens-k8s-proxy, so that it never leaves the main process. The cluster
 * reads neither header, so both go.
 */
export function stripToken(headers: IncomingHttpHeaders): void {
  delete headers.authorization;
  delete headers.cookie;
}

/**
 * Whether `actual` is the expected value, compared in constant time.
 *
 * Both sides are hashed first, so `timingSafeEqual` always compares two buffers
 * of one length and the time taken says nothing about the length or the content
 * of `actual`. An empty or missing `actual` matches nothing.
 */
export function tokenMatches(expected: string, actual: string | undefined): boolean {
  if (!actual) {
    return false;
  }

  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(actual).digest();

  return timingSafeEqual(expectedHash, actualHash);
}
