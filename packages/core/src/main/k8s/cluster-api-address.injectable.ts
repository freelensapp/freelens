/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import {
  apiBaseHostHeaderInjectionToken,
  apiBaseServerAddressInjectionToken,
} from "../../common/k8s-api/api-base-configs";
import { clusterApiAddressInjectionToken } from "../../common/k8s-api/cluster-api-address-injection-token";

const clusterApiAddressInjectable = getInjectable({
  id: "cluster-api-address",
  // Both of these read the lens-proxy port, which is unset until the proxy
  // listens — and `lensProxyInjectable` reaches this injectable itself, through
  // the node-shell-session route it registers. Resolving them at instantiation
  // would therefore throw while lens-proxy is still being built, so they are
  // resolved per call instead, by which time the proxy has a port.
  instantiate: (di) => (clusterId: string) => ({
    serverAddress: di.inject(apiBaseServerAddressInjectionToken),
    hostHeader: `${clusterId}.${di.inject(apiBaseHostHeaderInjectionToken)}`,
  }),
  injectionToken: clusterApiAddressInjectionToken,
});

export default clusterApiAddressInjectable;
