/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, makeObservable } from "mobx";
import { mapClusterToClusterInfo } from "./cluster-mapping";

import type { KubernetesCluster } from "../../../../common/catalog-entities/kubernetes-cluster";
import type { ClusterId, ClusterInfo } from "../../../../extensions/common-api/cluster-types";

export interface ClusterEnumerationDependencies {
  /** Get all KubernetesCluster entities from the catalog */
  readonly getKubernetesClusters: () => KubernetesCluster[];
  /** Get active cluster ID (renderer only) - returns undefined if no active tracking */
  readonly getActiveClusterId?: () => ClusterId | undefined;
  /** Get active cluster entity (renderer only) - for activeCluster property */
  readonly getActiveCluster?: () => KubernetesCluster | undefined;
}

/**
 * Unified cluster enumeration service.
 * Used by both Main and Renderer with process-specific dependencies.
 */
export class ClusterEnumeration {
  constructor(private readonly deps: ClusterEnumerationDependencies) {
    makeObservable(this);
  }

  /**
   * All clusters as ClusterInfo objects. Reactive.
   */
  @computed
  get clusters(): ClusterInfo[] {
    const activeId = this.deps.getActiveClusterId?.();

    return this.deps
      .getKubernetesClusters()
      .map((cluster) => mapClusterToClusterInfo(cluster, cluster.getId() === activeId));
  }

  /**
   * Currently active cluster (renderer only). Undefined if no active cluster or on main process.
   */
  @computed
  get activeCluster(): ClusterInfo | undefined {
    const activeCluster = this.deps.getActiveCluster?.();

    return activeCluster ? mapClusterToClusterInfo(activeCluster, true) : undefined;
  }

  /**
   * Find a cluster by ID.
   */
  getById(id: ClusterId): ClusterInfo | undefined {
    if (!id) {
      return undefined;
    }

    return this.clusters.find((cluster) => cluster.id === id);
  }
}
