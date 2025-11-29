/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { isKubernetesCluster, KubernetesCluster } from "../../common/catalog-entities/kubernetes-cluster";
import { ClusterEnumeration } from "../../features/cluster/enumeration/common";
import catalogEntityRegistryInjectable from "../api/catalog/entity/registry.injectable";

const rendererClusterEnumerationInjectable = getInjectable({
  id: "renderer-cluster-enumeration",

  instantiate: (di) => {
    const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);

    return new ClusterEnumeration({
      getKubernetesClusters: () =>
        catalogEntityRegistry.getItemsForApiKind<KubernetesCluster>(
          KubernetesCluster.apiVersion,
          KubernetesCluster.kind,
        ),

      getActiveClusterId: () => {
        const activeEntity = catalogEntityRegistry.activeEntity;

        return activeEntity && isKubernetesCluster(activeEntity) ? activeEntity.getId() : undefined;
      },

      getActiveCluster: () => {
        const activeEntity = catalogEntityRegistry.activeEntity;

        return activeEntity && isKubernetesCluster(activeEntity) ? activeEntity : undefined;
      },
    });
  },
});

export default rendererClusterEnumerationInjectable;
