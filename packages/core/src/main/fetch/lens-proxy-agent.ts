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
