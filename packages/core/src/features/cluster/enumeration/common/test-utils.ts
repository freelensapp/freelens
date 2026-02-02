/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubernetesCluster, LensKubernetesClusterStatus } from "../../../../common/catalog-entities/kubernetes-cluster";

import type { ClusterId } from "../../../../extensions/common-api/cluster-types";

export interface TestClusterOptions {
  id: ClusterId;
  name: string;
  status?: LensKubernetesClusterStatus;
  labels?: Record<string, string>;
  kubeConfigPath?: string;
  contextName?: string;
  distro?: string;
  kubeVersion?: string;
}

/**
 * Creates a KubernetesCluster entity for testing purposes.
 */
export function createTestCluster(options: TestClusterOptions): KubernetesCluster {
  return new KubernetesCluster({
    metadata: {
      uid: options.id,
      name: options.name,
      source: "test",
      labels: options.labels ?? {},
      distro: options.distro,
      kubeVersion: options.kubeVersion,
    },
    spec: {
      kubeconfigPath: options.kubeConfigPath ?? `/home/user/.kube/config-${options.id}`,
      kubeconfigContext: options.contextName ?? `context-${options.id}`,
    },
    status: {
      phase: options.status ?? LensKubernetesClusterStatus.DISCONNECTED,
    },
  });
}
