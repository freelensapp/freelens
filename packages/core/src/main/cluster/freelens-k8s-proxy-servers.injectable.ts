/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import type { FreelensK8sProxyServer } from "./freelens-k8s-proxy-server.injectable";

/**
 * Every freelens-k8s-proxy server created, whether its cluster is still in the
 * storage or not, so that quitting stops every proxy process they started.
 */
const freelensK8sProxyServersInjectable = getInjectable({
  id: "freelens-k8s-proxy-servers",
  instantiate: () => new Set<FreelensK8sProxyServer>(),
});

export default freelensK8sProxyServersInjectable;
