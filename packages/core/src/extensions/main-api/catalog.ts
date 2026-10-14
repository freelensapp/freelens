/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import catalogEntityRegistryInjectable from "../../main/catalog/entity-registry.injectable";
import clusterEnumerationInjectable from "../../main/cluster-enumeration/cluster-enumeration.injectable";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

import type { CatalogEntity } from "../../common/catalog";
import type { ClusterId, ClusterInfo } from "../common-api/cluster-types";

export const catalogCategories = asLazyInjectedForExtensionApi(catalogCategoryRegistryInjectable);
const catalogEntityRegistry = asLazyInjectedForExtensionApi(catalogEntityRegistryInjectable);

export interface CatalogEntityRegistry {
  getItemsForApiKind(apiVersion: string, kind: string): CatalogEntity[];
  /**
   * @deprecated use a cast instead of a unbounded type parameter
   */
  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[];
}

export const catalogEntities: CatalogEntityRegistry = {
  getItemsForApiKind(apiVersion: string, kind: string) {
    return catalogEntityRegistry.filterItemsForApiKind(apiVersion, kind);
  },
};

// Cluster enumeration API
const clusterEnumeration = asLazyInjectedForExtensionApi(clusterEnumerationInjectable);

/**
 * Get all registered Kubernetes clusters.
 *
 * Observable through the host's mobx: called inside a `reaction`, an
 * `autorun` or a `computed`, it runs it again when a cluster is added or
 * removed and when a field of one changes, its `status` among them. This is
 * how an extension follows a cluster connecting or disconnecting. The objects
 * returned are snapshots, so call the function inside the reaction rather
 * than keeping one.
 *
 * @returns Array of cluster information objects
 * @example
 * ```typescript
 * import { Main } from "@freelensapp/extensions";
 *
 * const clusters = Main.Catalog.getAllClusters();
 * for (const cluster of clusters) {
 *   console.log(`${cluster.name}: ${cluster.status}`);
 * }
 * ```
 */
export function getAllClusters(): ClusterInfo[] {
  return clusterEnumeration.clusters;
}

/**
 * Get a specific cluster by its ID.
 *
 * Observable through the host's mobx, like {@link getAllClusters}: a
 * `reaction` on it runs again when the cluster appears, disappears or
 * changes, its `status` among its fields.
 *
 * @param id - The unique identifier of the cluster
 * @returns The cluster information or undefined if not found
 * @example
 * ```typescript
 * import { Main } from "@freelensapp/extensions";
 *
 * const cluster = Main.Catalog.getClusterById("my-cluster-id");
 * if (cluster) {
 *   console.log(`Found: ${cluster.name}`);
 * }
 * ```
 * @example
 * ```typescript
 * import { Common, Main } from "@freelensapp/extensions";
 * import { reaction } from "mobx";
 *
 * // Dispose of it in onDeactivate() at the latest.
 * const dispose = reaction(
 *   () => Main.Catalog.getClusterById("my-cluster-id")?.status,
 *   (status) => {
 *     if (status !== Common.Clusters.ClusterConnectionStatus.CONNECTED) {
 *       console.log("my-cluster-id is not connected any more");
 *     }
 *   },
 * );
 * ```
 */
export function getClusterById(id: ClusterId): ClusterInfo | undefined {
  return clusterEnumeration.getById(id);
}
