/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { ClusterId } from "../cluster-types";

export interface ClusterApiAddress {
  /** Where to send the request. */
  serverAddress: string;
  /** The `Host` header that names the target cluster, when one is needed. */
  hostHeader?: string;
}

/**
 * How to reach a *specific* cluster through lens-proxy — which is not
 * necessarily the cluster whose frame the code runs in.
 *
 * lens-proxy picks the cluster from the request's host, and the two processes
 * put it there differently. Main connects to 127.0.0.1 and names the cluster
 * in a `Host` header. The renderer cannot: `host` is a forbidden header name,
 * so Chromium would drop it and the request would land on whatever origin the
 * frame is on — silently querying the wrong cluster. It has to address the
 * cluster in the URL instead, which works because Chromium's host-resolver
 * rules map every `*.renderer.freelens.app` to 127.0.0.1 and the lens-proxy
 * certificate covers them all.
 */
export const clusterApiAddressInjectionToken = getInjectionToken<(clusterId: ClusterId) => ClusterApiAddress>({
  id: "cluster-api-address-token",
});
