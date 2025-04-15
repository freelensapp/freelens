/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ClusterId } from "../cluster-types";

/**
 * Grab the `ClusterId` out of a host that was generated by `getClusterFrameUrl`, or nothing
 * @param host The host section of a URL
 * @returns The `ClusterId` part of the host, or `undefined`
 */
export function getClusterIdFromHost(host: string): ClusterId | undefined {
  // e.g host == "%clusterId.localhost:45345"
  const subDomains = host.split(":")[0].split(".");

  if (subDomains.length === 0) return undefined;

  if (subDomains[subDomains.length - 1] === "localhost") {
    subDomains.pop();
  } else if (subDomains.length >= 3 && subDomains.slice(-3).join(".") === "renderer.freelens.app") {
    subDomains.splice(-3);
  }

  return subDomains[subDomains.length - 1];
}

/**
 * Get the OpenLens backend routing host for a given `ClusterId`
 * @param clusterId The ID to put in front of the current host
 * @returns a new URL host section
 */
export function getClusterFrameUrl(clusterId: ClusterId) {
  return `//${clusterId}.${location.host}`;
}
