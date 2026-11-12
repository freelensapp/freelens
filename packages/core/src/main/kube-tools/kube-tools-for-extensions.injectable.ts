/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import httpsProxyConfigurationInjectable from "../../features/user-preferences/common/https-proxy.injectable";
import freelensProxyTokenInjectable from "../freelens-proxy/freelens-proxy-token.injectable";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../kubectl/create-kubectl.injectable";
import computeUserShellEnvironmentInjectable from "./compute-user-shell-environment.injectable";
import { composeKubeToolsEnvironment } from "./kube-tools";
import resolveKubeToolsInjectable from "./resolve-kube-tools.injectable";

import type { Cluster } from "../../common/cluster/cluster";
import type { EnvironmentVariables } from "../../features/shell-sync/main/compute-shell-environment.injectable";
import type { KubectlProgressOptions } from "../kubectl/kubectl";

export interface KubeToolsForExtensions {
  getKubectlPath(clusterId?: string, options?: KubectlProgressOptions): Promise<string>;
  getHelmPath(clusterId?: string): Promise<string>;
  getEnvironment(clusterId?: string, options?: KubectlProgressOptions): Promise<Record<string, string>>;
}

/**
 * What `Main.Shell` of the extension API hands out: the kubectl and helm the
 * terminals run, and the environment they start from, computed by the same
 * functions as the terminals' own. Unlike a terminal's, the environment does
 * not go through any extension's `terminalShellEnvModifier`, so that no
 * extension sees the variables of another.
 */
const kubeToolsForExtensionsInjectable = getInjectable({
  id: "kube-tools-for-extensions",

  instantiate: (di): KubeToolsForExtensions => {
    const logger = di.inject(loggerInjectionToken);
    const isWindows = di.inject(isWindowsInjectable);
    const getClusterById = di.inject(getClusterByIdInjectable);
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const computeUserShellEnvironment = di.inject(computeUserShellEnvironmentInjectable);
    const token = di.inject(freelensProxyTokenInjectable);
    const applicationHttpsProxy = di.inject(httpsProxyConfigurationInjectable);

    /**
     * Resolving the user's shell environment starts a login shell, which takes
     * a while, so it is cached the way a terminal caches it: a call gets the
     * last one resolved and refreshes it in the background.
     */
    let shellEnvironment: EnvironmentVariables | undefined;
    let refreshing: Promise<EnvironmentVariables> | undefined;

    const refreshShellEnvironment = () =>
      (refreshing ??= computeUserShellEnvironment()
        .then(({ environment, error }) => {
          if (error !== undefined) {
            logger.warn(`[KUBE-TOOLS]: using Freelens' own environment for extensions: ${error}`);
          }

          return (shellEnvironment = environment);
        })
        .finally(() => {
          refreshing = undefined;
        }));

    const getShellEnvironment = async () => {
      const refreshed = refreshShellEnvironment();

      if (shellEnvironment === undefined) {
        return refreshed;
      }

      refreshed.catch((error) => logger.warn("[KUBE-TOOLS]: failed to refresh the shell environment", error));

      return shellEnvironment;
    };

    const connectedCluster = (clusterId: string): Cluster => {
      const cluster = getClusterById(clusterId);

      if (!cluster) {
        throw new Error(`There is no cluster with the id "${clusterId}"`);
      }

      if (!cluster.accessible.get()) {
        throw new Error(`The cluster "${cluster.name.get()}" (${clusterId}) is not connected`);
      }

      return cluster;
    };

    const toolsForCluster = (cluster: Cluster, options?: KubectlProgressOptions) =>
      resolveKubeTools.forCluster(createKubectl(cluster.version.get()), options);

    const definedOnly = (env: EnvironmentVariables) =>
      Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined));

    return {
      getKubectlPath: async (clusterId, options) => {
        if (clusterId === undefined) {
          return resolveKubeTools.withoutCluster().kubectlPath;
        }

        // The same kubectl as `resolveKubeTools.forCluster`, except that an
        // unusable bundle rejects rather than leaving a bare name to `PATH`.
        return createKubectl(connectedCluster(clusterId).version.get()).getPath(options, {
          whenBundleUnusable: "reject",
        });
      },
      getHelmPath: async (clusterId) => {
        if (clusterId !== undefined) {
          connectedCluster(clusterId);
        }

        return resolveKubeTools.withoutCluster().helmPath;
      },
      getEnvironment: async (clusterId, options) => {
        if (clusterId === undefined) {
          return definedOnly(
            composeKubeToolsEnvironment({
              baseEnvironment: await getShellEnvironment(),
              tools: resolveKubeTools.withoutCluster(),
              httpsProxy: applicationHttpsProxy.get(),
              isWindows,
            }),
          );
        }

        const cluster = connectedCluster(clusterId);
        const { kubeconfigPath, cacheDirectoryPath } = await di
          .inject(kubeconfigManagerInjectable, cluster)
          .ensurePaths();
        const tools = await toolsForCluster(cluster, options);

        return definedOnly(
          composeKubeToolsEnvironment({
            baseEnvironment: await getShellEnvironment(),
            tools,
            clusterAccess: {
              kubeconfigPath,
              cacheDirectoryPath,
              token: token.value,
            },
            httpsProxy: cluster.preferences.httpsProxy,
            isWindows,
          }),
        );
      },
    };
  },
});

export default kubeToolsForExtensionsInjectable;
