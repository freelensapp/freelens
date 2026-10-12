/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { isKubernetesCluster } from "../../common/catalog-entities/kubernetes-cluster";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import catalogEntityRegistryInjectable from "../catalog/entity-registry.injectable";
import clusterConnectionInjectable from "./cluster-connection.injectable";
import removeProxyKubeconfigInjectable from "./remove-proxy-kubeconfig.injectable";

/**
 * Disconnects a cluster once it leaves the catalog, which stops its
 * freelens-k8s-proxy, and removes its proxy kubeconfig.
 *
 * A cluster leaves the catalog in more ways than the ones that disconnect it
 * themselves: its kubeconfig file is deleted, becomes unreadable, or its sync
 * is removed from the preferences, and an extension removes its source.
 */
const disconnectClustersRemovedFromCatalogInjectable = getInjectable({
  id: "disconnect-clusters-removed-from-catalog",
  instantiate: (di) => ({
    run: () => {
      const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
      const getClusterById = di.inject(getClusterByIdInjectable);
      const logger = di.inject(loggerInjectionToken);

      reaction(
        () =>
          new Set(catalogEntityRegistry.filterItemsByPredicate(isKubernetesCluster).map((entity) => entity.getId())),
        (clusterIds, previousClusterIds) => {
          for (const clusterId of previousClusterIds) {
            if (clusterIds.has(clusterId)) {
              continue;
            }

            // A cluster deleted from the storage was disconnected by whoever deleted it
            const cluster = getClusterById(clusterId);

            if (!cluster) {
              continue;
            }

            logger.info("[CLUSTER]: cluster left the catalog, disconnecting", { id: clusterId });
            di.inject(clusterConnectionInjectable, cluster).disconnect();
            void di.inject(removeProxyKubeconfigInjectable, cluster)();
          }
        },
      );
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default disconnectClustersRemovedFromCatalogInjectable;
