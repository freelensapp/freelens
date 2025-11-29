/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { logWarningInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import createKubeApiForRemoteClusterInjectable from "../../../../common/k8s-api/create-kube-api-for-remote-cluster.injectable";
import loadProxyKubeconfigInjectable from "../../../../main/cluster/load-proxy-kubeconfig.injectable";
import getClusterByIdInjectable from "../../storage/common/get-by-id.injectable";

import type { KubeApi } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor, KubeObject, KubeObjectConstructor } from "@freelensapp/kube-object";

/**
 * Result of creating a KubeApi for a specific cluster.
 */
export interface CreateKubeApiForClusterIdResult<T extends KubeObject> {
  /** The KubeApi instance configured for the cluster */
  readonly api: KubeApi<T>;
  /** The cluster ID for reference */
  readonly clusterId: string;
}

/**
 * Creates a KubeApi instance for any cluster by ID.
 * Uses proxy kubeconfig which routes through the lens auth proxy.
 *
 * @remarks
 * Only works for CONNECTED clusters where the auth proxy is running.
 * Returns undefined if cluster doesn't exist or is not accessible.
 */
export type CreateKubeApiForClusterId = <T extends KubeObject, D extends KubeJsonApiDataFor<T>>(
  clusterId: string,
  objectClass: KubeObjectConstructor<T, D>,
) => Promise<CreateKubeApiForClusterIdResult<T> | undefined>;

const createKubeApiForClusterIdInjectable = getInjectable({
  id: "create-kube-api-for-cluster-id",
  instantiate: (di): CreateKubeApiForClusterId => {
    const getClusterById = di.inject(getClusterByIdInjectable);
    const createKubeApiForRemoteCluster = di.inject(createKubeApiForRemoteClusterInjectable);
    const logWarn = di.inject(logWarningInjectionToken);

    return async (clusterId, objectClass) => {
      const cluster = getClusterById(clusterId);

      if (!cluster) {
        logWarn(`[execute-api] Cluster not found: ${clusterId}`);
        return undefined;
      }

      // CRITICAL: Auth proxy only available for connected clusters
      if (!cluster.accessible.get()) {
        logWarn(`[execute-api] Cluster not accessible (auth proxy not running): ${clusterId}`);
        return undefined;
      }

      // Load proxy kubeconfig - this routes through the lens auth proxy
      const loadProxyKubeconfig = di.inject(loadProxyKubeconfigInjectable, cluster);
      const kubeconfig = await loadProxyKubeconfig();

      const contextName = cluster.contextName.get();
      const context = kubeconfig.getContextObject(contextName);
      const clusterConfig = kubeconfig.getCluster(context?.cluster ?? "");

      if (!clusterConfig?.server) {
        logWarn(`[execute-api] No server in kubeconfig for cluster: ${clusterId}`);
        return undefined;
      }

      // Create KubeApi using the proxy kubeconfig
      // No user credentials needed - auth is handled by the lens proxy
      const api = createKubeApiForRemoteCluster(
        {
          cluster: {
            server: clusterConfig.server,
            caData: clusterConfig.caData,
            skipTLSVerify: clusterConfig.skipTLSVerify,
          },
          user: {}, // Auth handled by proxy
        },
        objectClass,
      );

      return { api, clusterId };
    };
  },
});

export default createKubeApiForClusterIdInjectable;
