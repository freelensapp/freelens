/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import rendererClusterEnumerationInjectable from "../../renderer/cluster-enumeration/cluster-enumeration.injectable";
import activeKubernetesClusterInjectable from "../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";

import type { Disposer } from "@freelensapp/utilities";

import type { CatalogCategory, CatalogEntity } from "../../common/catalog";
import type { CatalogEntityOnBeforeRun } from "../../renderer/api/catalog/entity/registry";
import type { ClusterId, ClusterInfo } from "../common-api/cluster-types";

export const catalogCategories = asLegacyGlobalForExtensionApi(catalogCategoryRegistryInjectable);

const internalEntityRegistry = asLegacyGlobalForExtensionApi(catalogEntityRegistryInjectable);

export class CatalogEntityRegistry {
  /**
   * Currently active/visible entity
   */
  get activeEntity() {
    return internalEntityRegistry.activeEntity;
  }

  get entities(): Map<string, CatalogEntity> {
    return internalEntityRegistry.entities;
  }

  getById(id: string) {
    return this.entities.get(id);
  }

  getItemsForApiKind<T extends CatalogEntity>(apiVersion: string, kind: string): T[] {
    return internalEntityRegistry.getItemsForApiKind<T>(apiVersion, kind);
  }

  getItemsForCategory<T extends CatalogEntity>(category: CatalogCategory): T[] {
    return internalEntityRegistry.getItemsForCategory(category);
  }

  /**
   * Add a onBeforeRun hook to a catalog entities. If `onBeforeRun` was previously
   * added then it will not be added again.
   * @param onBeforeRun The function to be called with a `CatalogRunEvent`
   * event target will be the catalog entity. onBeforeRun hook can call event.preventDefault()
   * to stop run sequence
   * @returns A function to remove that hook
   */
  addOnBeforeRun(onBeforeRun: CatalogEntityOnBeforeRun): Disposer {
    return internalEntityRegistry.addOnBeforeRun(onBeforeRun);
  }
}

export const catalogEntities = new CatalogEntityRegistry();

export const activeCluster = asLegacyGlobalForExtensionApi(activeKubernetesClusterInjectable);

// Cluster enumeration API
const clusterEnumeration = asLegacyGlobalForExtensionApi(rendererClusterEnumerationInjectable);

/**
 * Get all registered Kubernetes clusters.
 *
 * @returns Array of cluster information objects
 * @example
 * ```typescript
 * import { Catalog } from "@freelensapp/core/renderer";
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
 * import { Catalog } from "@freelensapp/core/renderer";
 *
 * const cluster = Catalog.getClusterById("my-cluster-id");
 * if (cluster) {
 *   console.log(`Found: ${cluster.name}`);
 * }
 * ```
 */
export function getClusterById(id: ClusterId): ClusterInfo | undefined {
  return clusterEnumeration.getById(id);
}

/**
 * Get the currently active cluster (if any).
 *
 * @returns The active cluster information or undefined if no cluster is active
 * @example
 * ```typescript
 * import { Catalog } from "@freelensapp/core/renderer";
 *
 * const active = Catalog.getActiveCluster();
 * if (active) {
 *   console.log(`Active cluster: ${active.name}`);
 * }
 * ```
 */
export function getActiveCluster(): ClusterInfo | undefined {
  return clusterEnumeration.activeCluster;
}
