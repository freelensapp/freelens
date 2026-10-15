/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import catalogCategoryRegistryInjectable from "../../common/catalog/category-registry.injectable";
import catalogEntityRegistryInjectable from "../../renderer/api/catalog/entity/registry.injectable";
import rendererClusterEnumerationInjectable from "../../renderer/cluster-enumeration/cluster-enumeration.injectable";
import activeKubernetesClusterInjectable from "../../renderer/cluster-frame-context/active-kubernetes-cluster.injectable";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

import type { Disposer } from "@freelensapp/utilities";

import type { CatalogCategory, CatalogEntity } from "../../common/catalog";
import type { CatalogEntityOnBeforeRun } from "../../renderer/api/catalog/entity/registry";
import type { ClusterId, ClusterInfo } from "../common-api/cluster-types";

export const catalogCategories = asLazyInjectedForExtensionApi(catalogCategoryRegistryInjectable);

const internalEntityRegistry = asLazyInjectedForExtensionApi(catalogEntityRegistryInjectable);

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

export const activeCluster = asLazyInjectedForExtensionApi(activeKubernetesClusterInjectable);

// Cluster enumeration API
const clusterEnumeration = asLazyInjectedForExtensionApi(rendererClusterEnumerationInjectable);

/**
 * Get all registered Kubernetes clusters.
 *
 * Observable through the host's mobx: called inside a `reaction`, an
 * `autorun`, a `computed` or an `observer` component, it runs it again when a
 * cluster is added or removed and when a field of one changes, its `status`
 * among them. This is how an extension follows a cluster connecting or
 * disconnecting. The objects returned are snapshots, so call the function
 * inside the reaction rather than keeping one.
 *
 * @returns Array of cluster information objects
 * @example
 * ```typescript
 * import { Renderer } from "@freelensapp/extensions";
 *
 * const clusters = Renderer.Catalog.getAllClusters();
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
 * import { Renderer } from "@freelensapp/extensions";
 *
 * const cluster = Renderer.Catalog.getClusterById("my-cluster-id");
 * if (cluster) {
 *   console.log(`Found: ${cluster.name}`);
 * }
 * ```
 * @example
 * ```typescript
 * import { Common, Renderer } from "@freelensapp/extensions";
 * import { reaction } from "mobx";
 *
 * // Dispose of it in onDeactivate() at the latest.
 * const dispose = reaction(
 *   () => Renderer.Catalog.getClusterById("my-cluster-id")?.status,
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

/**
 * Get the currently active cluster (if any).
 *
 * @returns The active cluster information or undefined if no cluster is active
 * @example
 * ```typescript
 * import { Renderer } from "@freelensapp/extensions";
 *
 * const active = Renderer.Catalog.getActiveCluster();
 * if (active) {
 *   console.log(`Active cluster: ${active.name}`);
 * }
 * ```
 */
export function getActiveCluster(): ClusterInfo | undefined {
  return clusterEnumeration.activeCluster;
}
