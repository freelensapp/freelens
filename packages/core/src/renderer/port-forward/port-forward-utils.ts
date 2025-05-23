/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ForwardedPort } from "./port-forward-item";

export function portForwardAddress(portForward: ForwardedPort) {
  const address = portForward.address?.split(",")[0].trim() ?? "localhost";
  return `${portForward.protocol ?? "http"}://${address}:${portForward.forwardPort}`;
}

export function predictProtocol(name: string | undefined) {
  return name === "https" ? "https" : "http";
}
