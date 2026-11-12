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

type DispatchHeaders = Dispatcher.DispatchOptions["headers"];

const isAuthorization = (name: unknown) => String(name).toLowerCase() === "authorization";

/**
 * Returns the headers with `Authorization` set to the bearer token, replacing
 * any already there, and keeping the header shape (flat array, iterable of
 * pairs, or object) undici was given.
 */
const withAuthorization = (headers: DispatchHeaders, token: string): DispatchHeaders => {
  const authorization = `Bearer ${token}`;

  if (!headers) {
    return { authorization };
  }

  if (Array.isArray(headers)) {
    const kept: string[] = [];

    for (let i = 0; i < headers.length; i += 2) {
      if (!isAuthorization(headers[i])) {
        kept.push(headers[i], headers[i + 1]);
      }
    }

    kept.push("authorization", authorization);

    return kept;
  }

  if (Symbol.iterator in headers) {
    const kept = [...(headers as Iterable<[string, unknown]>)].filter(([name]) => !isAuthorization(name));

    return [...kept, ["authorization", authorization]] as unknown as DispatchHeaders;
  }

  const kept = Object.fromEntries(Object.entries(headers).filter(([name]) => !isAuthorization(name)));

  return { ...kept, authorization };
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
    dispatch({ ...options, headers: withAuthorization(options.headers, token) }, handler);
