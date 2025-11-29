/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import catalogEntityRegistryInjectable from "../../main/catalog/entity-registry.injectable";
import clusterEnumerationInjectable from "../../main/cluster-enumeration/cluster-enumeration.injectable";

import type { CatalogEntity } from "../../common/catalog";
import type { ClusterInfo } from "../common-api/cluster-types";

export const catalogCategories = asLegacyGlobalForExtensionApi(catalogCategoryRegistryInjectable);
const catalogEntityRegistry = asLegacyGlobalForExtensionApi(catalogEntityRegistryInjectable);

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
const clusterEnumeration = asLegacyGlobalForExtensionApi(clusterEnumerationInjectable);

/**
 * Get all registered Kubernetes clusters.
 *
 * @returns Array of cluster information objects
 * @example
 * ```typescript
 * import { Catalog } from "@freelensapp/core/main";
 *
 * const clusters = Catalog.getAllClusters();
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
 * @param id - The unique identifier of the cluster
 * @returns The cluster information or undefined if not found
 * @example
 * ```typescript
 * import { Catalog } from "@freelensapp/core/main";
 *
 * const cluster = Catalog.getClusterById("my-cluster-id");
 * if (cluster) {
 *   console.log(`Found: ${cluster.name}`);
 * }
 * ```
 */
export function getClusterById(id: string): ClusterInfo | undefined {
  return clusterEnumeration.getById(id);
}
