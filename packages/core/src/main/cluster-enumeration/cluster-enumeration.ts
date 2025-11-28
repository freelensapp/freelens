/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, makeObservable } from "mobx";
import { isKubernetesCluster, LensKubernetesClusterStatus } from "../../common/catalog-entities/kubernetes-cluster";
import {
  ClusterConnectionStatus,
  type ClusterInfo,
  type ClusterMetadata,
} from "../../extensions/common-api/cluster-types";

import type { KubernetesCluster } from "../../common/catalog-entities/kubernetes-cluster";
import type { CatalogEntityRegistry } from "../catalog/entity-registry";

export interface ClusterEnumerationDependencies {
  readonly catalogEntityRegistry: CatalogEntityRegistry;
}

/**
 * Converts internal status to public ClusterConnectionStatus.
 */
function mapClusterStatus(internalStatus: string | undefined): ClusterConnectionStatus {
  switch (internalStatus) {
    case LensKubernetesClusterStatus.CONNECTED:
      return ClusterConnectionStatus.CONNECTED;
    case LensKubernetesClusterStatus.CONNECTING:
      return ClusterConnectionStatus.CONNECTING;
    case LensKubernetesClusterStatus.DELETING:
      return ClusterConnectionStatus.DISCONNECTING;
    case LensKubernetesClusterStatus.DISCONNECTED:
    default:
      return ClusterConnectionStatus.DISCONNECTED;
  }
}

function extractClusterMetadata(cluster: KubernetesCluster): ClusterMetadata {
  return {
    distribution: cluster.metadata.distro,
    kubernetesVersion: cluster.metadata.kubeVersion,
  };
}

/**
 * Filters out undefined label values since ClusterInfo expects Record<string, string>.
 */
function sanitizeLabels(labels: Partial<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(labels)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

function mapClusterToClusterInfo(cluster: KubernetesCluster): ClusterInfo {
  return {
    id: cluster.getId(),
    name: cluster.getName(),
    kubeConfigPath: cluster.spec.kubeconfigPath,
    contextName: cluster.spec.kubeconfigContext,
    status: mapClusterStatus(cluster.status.phase),
    labels: sanitizeLabels(cluster.metadata.labels),
    isActive: false, // Determined by renderer's active entity tracking
    metadata: extractClusterMetadata(cluster),
  };
}

/**
 * Provides access to all Kubernetes clusters in the catalog.
 * Updates reactively when clusters are added, removed, or modified.
 */
export class ClusterEnumeration {
  constructor(private readonly dependencies: ClusterEnumerationDependencies) {
    makeObservable(this);
  }

  /**
   * All clusters as ClusterInfo objects. Reactive - updates automatically.
   */
  @computed
  get clusters(): ClusterInfo[] {
    const kubernetesClusters = this.dependencies.catalogEntityRegistry.filterItemsByPredicate(isKubernetesCluster);

    return kubernetesClusters.map(mapClusterToClusterInfo);
  }

  /**
   * Find a cluster by ID.
   */
  getById(id: string): ClusterInfo | undefined {
    if (!id) {
      return undefined;
    }

    return this.clusters.find((cluster) => cluster.id === id);
  }
}
