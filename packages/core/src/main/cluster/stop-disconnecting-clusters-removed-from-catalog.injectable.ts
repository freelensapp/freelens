/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { onQuitOfBackEndInjectionToken } from "../start-main-application/runnable-tokens/phases";
import disconnectClustersRemovedFromCatalogInjectable from "./disconnect-clusters-removed-from-catalog.injectable";

/**
 * Stops reacting on clusters that leave the catalog before the quit empties
 * it: stopping the kubeconfig sync and the extensions removes their sources,
 * which would otherwise disconnect every cluster and remove every proxy
 * kubeconfig on the way out. Those runnables `runAfter` this one, because
 * runnables of one phase without it run concurrently in no set order.
 */
const stopDisconnectingClustersRemovedFromCatalogInjectable = getInjectable({
  id: "stop-disconnecting-clusters-removed-from-catalog",
  instantiate: (di) => ({
    run: () => {
      const disconnectClustersRemovedFromCatalog = di.inject(disconnectClustersRemovedFromCatalogInjectable);

      // A quit before the application has loaded finds it not started
      if (disconnectClustersRemovedFromCatalog.started) {
        disconnectClustersRemovedFromCatalog.stop();
      }

      return undefined;
    },
  }),
  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopDisconnectingClustersRemovedFromCatalogInjectable;
