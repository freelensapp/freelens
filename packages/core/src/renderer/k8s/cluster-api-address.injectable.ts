/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { clusterApiAddressInjectionToken } from "../../common/k8s-api/cluster-api-address-injection-token";
import windowLocationInjectable from "../../common/k8s-api/window-location.injectable";
import { getClusterIdFromHost } from "../../common/utils/cluster-id-url-parsing";

const clusterApiAddressInjectable = getInjectable({
  id: "cluster-api-address",
  instantiate: (di) => {
    const { host } = di.inject(windowLocationInjectable);
    // A cluster frame is served from `<clusterId>.<lens-proxy authority>`, so
    // the authority any *other* cluster is addressed through is what remains
    // once that leading label is taken off.
    const clusterIdOfThisFrame = getClusterIdFromHost(host);
    const authority = clusterIdOfThisFrame ? host.slice(clusterIdOfThisFrame.length + 1) : host;

    // No `Host` header: the cluster is named in the URL, which is the only way
    // Chromium can carry it.
    return (clusterId: string) => ({ serverAddress: `https://${clusterId}.${authority}` });
  },
  injectionToken: clusterApiAddressInjectionToken,
});

export default clusterApiAddressInjectable;
