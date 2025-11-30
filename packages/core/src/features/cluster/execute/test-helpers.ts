/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Cluster } from "../../../common/cluster/cluster";

/**
 * Creates a mock Cluster instance for testing.
 *
 * @param id - Cluster identifier
 * @param accessible - Whether the cluster is accessible (auth proxy running)
 * @returns Configured Cluster instance
 */
export function createMockCluster(id: string, accessible: boolean): Cluster {
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
 * Configuration options for creating a mock proxy kubeconfig.
 */
export interface MockProxyKubeconfigOptions {
  /** Context name - typically "context-{clusterId}" */
  contextName: string;
  /** Proxy server URL - typically "https://127.0.0.1:{port}/{clusterId}" */
  server: string;
  /** Base64-encoded CA certificate data (optional) */
  caData?: string;
  /** Whether to skip TLS verification (default: false) */
  skipTLSVerify?: boolean;
}

/**
 * Creates a mock KubeConfig that mimics the proxy kubeconfig structure.
 *
 * The proxy kubeconfig has:
 * - server: https://127.0.0.1:{port}/{clusterId}
 * - caData: proxy's self-signed certificate
 * - context.cluster references the cluster name (which equals contextName in proxy kubeconfig)
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

/**
 * Creates a mock KubeJsonApi for testing API operations.
 * Allows capturing request details and configuring mock responses.
 */
export interface MockKubeJsonApiConfig {
  get?: jest.Mock;
  post?: jest.Mock;
  put?: jest.Mock;
  patch?: jest.Mock;
  del?: jest.Mock;
}

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
 * Common test cluster configurations.
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
