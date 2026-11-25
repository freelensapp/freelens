/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import kubeconfigSyncManagerInjectable from "../../../catalog-sources/kubeconfig-sync/manager.injectable";
import stopDisconnectingClustersRemovedFromCatalogInjectable from "../../../cluster/stop-disconnecting-clusters-removed-from-catalog.injectable";
import { onQuitOfBackEndInjectionToken } from "../../runnable-tokens/phases";

const stopKubeConfigSyncInjectable = getInjectable({
  id: "stop-kube-config-sync",

  instantiate: (di) => ({
    run: () => {
      const kubeConfigSyncManager = di.inject(kubeconfigSyncManagerInjectable);

      kubeConfigSyncManager.stopSync();

      return undefined;
    },
    // Stopping the sync removes its clusters from the catalog
    runAfter: stopDisconnectingClustersRemovedFromCatalogInjectable,
  }),

  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopKubeConfigSyncInjectable;
