/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubernetesCluster } from "../../../../common/catalog-entities/kubernetes-cluster";
import { Cluster } from "../../../../common/cluster/cluster";

import type { ClusterId } from "../../../../extensions/common-api/cluster-types";

/**
 * Creates a mock Cluster instance (internal model) for main process tests.
 */
export function createMockCluster(id: ClusterId, accessible: boolean): Cluster {
  const contextName = `context-${id}`;
  const cluster = new Cluster({
    id,
    contextName,
    kubeConfigPath: `/path/to/kubeconfig-${id}`,
  });
  cluster.accessible.set(accessible);
  cluster.contextName.set(contextName);
  return cluster;
}

/**
 * Creates a mock KubernetesCluster catalog entity for renderer tests.
 */
export function createMockClusterEntity(id: ClusterId, status: "connected" | "disconnected"): KubernetesCluster {
  return new KubernetesCluster({
    metadata: {
      uid: id,
      name: `Cluster ${id}`,
      labels: {},
    },
    spec: {
      kubeconfigPath: `/path/to/kubeconfig-${id}`,
      kubeconfigContext: `context-${id}`,
    },
    status: {
      phase: status,
    },
  });
}

export interface MockProxyKubeconfigOptions {
  contextName: string;
  server: string;
  caData?: string;
  skipTLSVerify?: boolean;
}

/**
 * Creates a mock KubeConfig mimicking the proxy kubeconfig structure.
 */
export function createMockProxyKubeconfig(options: MockProxyKubeconfigOptions) {
  const { contextName, server, caData, skipTLSVerify = false } = options;

  return {
    getContextObject: (name: string) =>
      name === contextName ? { cluster: contextName, user: "proxy", namespace: undefined } : undefined,
    getCluster: (name: string) =>
      name === contextName
        ? {
            server,
            caData,
            skipTLSVerify,
          }
        : undefined,
  };
}

export interface MockKubeJsonApiConfig {
  get?: jest.Mock;
  post?: jest.Mock;
  put?: jest.Mock;
  patch?: jest.Mock;
  del?: jest.Mock;
}

/**
 * Creates a mock KubeJsonApi for testing API operations.
 */
export function createMockKubeJsonApi(config: MockKubeJsonApiConfig = {}) {
  return {
    get: config.get ?? jest.fn().mockResolvedValue({ items: [] }),
    post: config.post ?? jest.fn().mockResolvedValue({}),
    put: config.put ?? jest.fn().mockResolvedValue({}),
    patch: config.patch ?? jest.fn().mockResolvedValue({}),
    del: config.del ?? jest.fn().mockResolvedValue({}),
  };
}

/**
 * Pre-configured test cluster configurations.
 */
export const TEST_CLUSTER_CONFIGS = {
  accessible: {
    id: "accessible-cluster",
    get contextName() {
      return `context-${this.id}`;
    },
    get proxyServer() {
      return `https://127.0.0.1:9191/${this.id}`;
    },
    proxyCaData: Buffer.from("proxy-self-signed-cert").toString("base64"),
  },
  inaccessible: {
    id: "inaccessible-cluster",
    get contextName() {
      return `context-${this.id}`;
    },
  },
} as const;
