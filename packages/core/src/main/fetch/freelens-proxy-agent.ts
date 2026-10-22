/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Agent } from "undici";

import type { Dispatcher } from "undici";

const agents = new Map<string, Agent>();

/**
 * A dispatcher that trusts the self-signed freelens-proxy certificate.
 *
 * undici pools sockets per dispatcher, so — unlike the `https.Agent` this
 * replaces — a fresh one per request would leak connections. The certificate is
 * generated once per process, so one dispatcher per certificate is enough.
 *
 * Main negotiates HTTP/2 with freelens-proxy on purpose, as undici does by default:
 * the renderer does too, so every client of the server takes the same protocol
 * path. undici sends the `Host` header of a request as `:authority`, which is
 * what freelens-proxy routes on over HTTP/2.
 */
export const getFreelensProxyAgent = (ca: string | undefined): Dispatcher => {
  const key = ca ?? "";
  const existing = agents.get(key);

  if (existing) {
    return existing;
  }

  const agent = new Agent({ connect: { ca } });

  agents.set(key, agent);

  return agent;
};

/**
 * Adds `Authorization: Bearer <token>` to every request, so that the main
 * process carries the freelens-proxy token the way a terminal, kubectl and helm
 * do. The cluster frames carry it as a cookie instead.
 */
export const withBearerToken =
  (token: string): Dispatcher.DispatcherComposeInterceptor =>
  (dispatch) =>
  (options, handler) =>
    dispatch(
      {
        ...options,
        headers: Array.isArray(options.headers)
          ? [...options.headers, "authorization", `Bearer ${token}`]
          : { ...(options.headers as Record<string, unknown>), authorization: `Bearer ${token}` },
      },
      handler,
    );
