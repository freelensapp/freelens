/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  type KubernetesCluster,
  LensKubernetesClusterStatus,
} from "../../../../common/catalog-entities/kubernetes-cluster";
import {
  ClusterConnectionStatus,
  type ClusterInfo,
  type ClusterMetadata,
} from "../../../../extensions/common-api/cluster-types";

/**
 * Converts internal LensKubernetesClusterStatus to public ClusterConnectionStatus.
 */
export function mapClusterStatus(internalStatus: string | undefined): ClusterConnectionStatus {
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

/**
 * Extracts cluster metadata from a KubernetesCluster entity.
 */
export function extractClusterMetadata(cluster: KubernetesCluster): ClusterMetadata {
  return {
    distribution: cluster.metadata.distro,
    kubernetesVersion: cluster.metadata.kubeVersion,
  };
}

/**
 * Filters out undefined label values since ClusterInfo expects Record<string, string>.
 */
export function sanitizeLabels(labels: Partial<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(labels)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Maps a KubernetesCluster entity to public ClusterInfo.
 */
export function mapClusterToClusterInfo(cluster: KubernetesCluster, isActive: boolean): ClusterInfo {
  return {
    id: cluster.getId(),
    name: cluster.getName(),
    kubeConfigPath: cluster.spec.kubeconfigPath,
    contextName: cluster.spec.kubeconfigContext,
    status: mapClusterStatus(cluster.status.phase),
    labels: sanitizeLabels(cluster.metadata.labels),
    isActive,
    metadata: extractClusterMetadata(cluster),
  };
}
