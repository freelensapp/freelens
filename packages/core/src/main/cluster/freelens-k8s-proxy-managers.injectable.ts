/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import type { FreelensK8sProxyManager } from "./freelens-k8s-proxy-manager.injectable";

/**
 * Every freelens-k8s-proxy manager created, whether its cluster is still in the
 * storage or not, so that quitting stops every proxy process they started.
 */
const freelensK8sProxyManagersInjectable = getInjectable({
  id: "freelens-k8s-proxy-managers",
  instantiate: () => new Set<FreelensK8sProxyManager>(),
});

export default freelensK8sProxyManagersInjectable;
