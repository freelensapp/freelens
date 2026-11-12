/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { onQuitOfBackEndInjectionToken } from "../start-main-application/runnable-tokens/phases";
import freelensK8sProxyManagersInjectable from "./freelens-k8s-proxy-managers.injectable";

/**
 * Stops the proxy process of every freelens-k8s-proxy manager. A child process
 * outlives the application that spawned it, so one left running here ends up
 * under PID 1 with the credentials of its cluster.
 *
 * Disconnecting the clusters on quit only reaches the servers of the clusters
 * still in the storage; this reaches every server, whatever its cluster.
 */
const stopFreelensK8sProxiesOnQuitInjectable = getInjectable({
  id: "stop-freelens-k8s-proxies-on-quit",
  instantiate: (di) => ({
    run: () => {
      for (const freelensK8sProxyManager of di.inject(freelensK8sProxyManagersInjectable)) {
        freelensK8sProxyManager.stop();
      }
    },
  }),
  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopFreelensK8sProxiesOnQuitInjectable;
