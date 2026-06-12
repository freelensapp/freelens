/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterApplicationIsLoadedInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import catalogEntityRegistryInjectable from "../../../catalog/entity-registry.injectable";
import kubeconfigSyncManagerInjectable from "../../../catalog-sources/kubeconfig-sync/manager.injectable";

const addKubeconfigSyncAsEntitySourceInjectable = getInjectable({
  id: "add-kubeconfig-sync-as-entity-source",
  instantiate: (di) => ({
    run: () => {
      const kubeConfigSyncManager = di.inject(kubeconfigSyncManagerInjectable);
      const entityRegistry = di.inject(catalogEntityRegistryInjectable);

      entityRegistry.addComputedSource("kubeconfig-sync", kubeConfigSyncManager.source);
    },
  }),
  injectionToken: afterApplicationIsLoadedInjectionToken,
});

export default addKubeconfigSyncAsEntitySourceInjectable;
