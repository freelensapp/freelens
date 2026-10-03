/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Agent } from "undici";

import type { Dispatcher } from "undici";

const agents = new Map<string, Agent>();

/**
 * A dispatcher that trusts the self-signed lens-proxy certificate.
 *
 * undici pools sockets per dispatcher, so — unlike the `https.Agent` this
 * replaces — a fresh one per request would leak connections. The certificate is
 * generated once per process, so one dispatcher per certificate is enough.
 *
 * Main negotiates HTTP/2 with lens-proxy on purpose, as undici does by default:
 * the renderer does too, so every client of the server takes the same protocol
 * path. undici sends the `Host` header of a request as `:authority`, which is
 * what lens-proxy routes on over HTTP/2.
 */
export const getLensProxyAgent = (ca: string | undefined): Dispatcher => {
  const key = ca ?? "";
  const existing = agents.get(key);

  if (existing) {
    return existing;
  }

  const agent = new Agent({ connect: { ca } });

  agents.set(key, agent);

  return agent;
};
