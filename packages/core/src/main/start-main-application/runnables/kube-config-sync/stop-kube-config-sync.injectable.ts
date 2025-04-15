/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import kubeconfigSyncManagerInjectable from "../../../catalog-sources/kubeconfig-sync/manager.injectable";
import { onQuitOfBackEndInjectionToken } from "../../runnable-tokens/phases";

const stopKubeConfigSyncInjectable = getInjectable({
  id: "stop-kube-config-sync",

  instantiate: (di) => ({
    run: () => {
      const kubeConfigSyncManager = di.inject(kubeconfigSyncManagerInjectable);

      kubeConfigSyncManager.stopSync();

      return undefined;
    },
  }),

  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopKubeConfigSyncInjectable;
