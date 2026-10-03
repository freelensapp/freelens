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
 * lens-proxy answers HTTP/2 as well, which undici negotiates by default. Main
 * stays on HTTP/1.1: the agent opens as many connections to a host as it
 * needs, so HTTP/2 would gain it nothing.
 */
export const getLensProxyAgent = (ca: string | undefined): Dispatcher => {
  const key = ca ?? "";
  const existing = agents.get(key);

  if (existing) {
    return existing;
  }

  const agent = new Agent({ allowH2: false, connect: { ca } });

  agents.set(key, agent);

  return agent;
};
