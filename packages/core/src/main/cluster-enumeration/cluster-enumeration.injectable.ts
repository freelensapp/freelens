/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { isKubernetesCluster } from "../../common/catalog-entities/kubernetes-cluster";
import { ClusterEnumeration } from "../../features/cluster/enumeration/common";
import catalogEntityRegistryInjectable from "../catalog/entity-registry.injectable";

const clusterEnumerationInjectable = getInjectable({
  id: "cluster-enumeration",

  instantiate: (di) => {
    const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);

    return new ClusterEnumeration({
      getKubernetesClusters: () => catalogEntityRegistry.filterItemsByPredicate(isKubernetesCluster),
      // Main process doesn't track active cluster
    });
  },
});

export default clusterEnumerationInjectable;
