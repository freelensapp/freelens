/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { Cluster } from "../../../../../common/cluster/cluster";
import createKubeApiForRemoteClusterInjectable from "../../../../../common/k8s-api/create-kube-api-for-remote-cluster.injectable";
import loadProxyKubeconfigInjectable from "../../../../../main/cluster/load-proxy-kubeconfig.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import clustersStateInjectable from "../../../storage/common/state.injectable";
import createKubeApiForClusterIdInjectable from "../create-kube-api-for-cluster-id.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CreateKubeApiForRemoteClusterConfig } from "../../../../../common/k8s-api/create-kube-api-for-remote-cluster.injectable";

describe("createKubeApiForClusterId", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  function createMockCluster(id: string, accessible: boolean): Cluster {
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
   * Creates a mock KubeConfig that mimics the proxy kubeconfig structure.
   * The proxy kubeconfig has:
   * - server: https://127.0.0.1:{port}/{clusterId}
   * - caData: proxy's self-signed certificate
   * - context.cluster references the cluster name (which equals contextName in proxy kubeconfig)
   */
  function createMockProxyKubeconfig(contextName: string, server: string, caData?: string) {
    return {
      getContextObject: (name: string) =>
        name === contextName ? { cluster: contextName, user: "proxy", namespace: undefined } : undefined,
      getCluster: (name: string) =>
        name === contextName
          ? {
              server,
              caData,
              skipTLSVerify: false,
            }
          : undefined,
    };
  }

  describe("when cluster does not exist", () => {
    it("returns undefined", async () => {
      const createKubeApiForClusterId = di.inject(createKubeApiForClusterIdInjectable);

      const result = await createKubeApiForClusterId("non-existent-cluster", Pod);

      expect(result).toBeUndefined();
    });
  });

  describe("when cluster exists but is not accessible (auth proxy not running)", () => {
    it("returns undefined", async () => {
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster("inaccessible-cluster", false);
      clustersState.set("inaccessible-cluster", cluster);

      const createKubeApiForClusterId = di.inject(createKubeApiForClusterIdInjectable);
      const result = await createKubeApiForClusterId("inaccessible-cluster", Pod);

      expect(result).toBeUndefined();
    });
  });

  describe("when cluster exists and is accessible", () => {
    const clusterId = "accessible-cluster";
    const contextName = `context-${clusterId}`;
    const proxyServer = `https://127.0.0.1:9191/${clusterId}`;
    const proxyCaData = Buffer.from("proxy-self-signed-cert").toString("base64");

    it("creates KubeApi using proxy kubeconfig with correct config", async () => {
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster(clusterId, true);
      clustersState.set(clusterId, cluster);

      // Mock loadProxyKubeconfig to return proxy kubeconfig structure
      const mockKubeConfig = createMockProxyKubeconfig(contextName, proxyServer, proxyCaData);
      di.override(loadProxyKubeconfigInjectable, () => async () => mockKubeConfig as any);

      // Capture config passed to createKubeApiForRemoteCluster
      let capturedConfig: CreateKubeApiForRemoteClusterConfig | undefined;
      let capturedObjectClass: any;
      di.override(createKubeApiForRemoteClusterInjectable, () => (config: any, objectClass: any) => {
        capturedConfig = config;
        capturedObjectClass = objectClass;
        return { kind: objectClass.kind } as any;
      });

      const createKubeApiForClusterId = di.inject(createKubeApiForClusterIdInjectable);
      const result = await createKubeApiForClusterId(clusterId, Pod);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result?.clusterId).toBe(clusterId);
      expect(result?.api).toBeDefined();

      // Verify cluster config passed to remote API factory
      expect(capturedConfig).toBeDefined();
      expect(capturedConfig?.cluster.server).toBe(proxyServer);
      expect(capturedConfig?.cluster.caData).toBe(proxyCaData);
      expect(capturedConfig?.cluster.skipTLSVerify).toBe(false);

      // Verify user config is empty (auth handled by proxy)
      expect(capturedConfig?.user).toEqual({});

      // Verify correct object class is passed
      expect(capturedObjectClass).toBe(Pod);
    });

    it("returns undefined when kubeconfig has no server", async () => {
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster(clusterId, true);
      clustersState.set(clusterId, cluster);

      // Mock kubeconfig with missing server
      const mockKubeConfig = {
        getContextObject: () => ({ cluster: contextName }),
        getCluster: () => ({ server: undefined }),
      };
      di.override(loadProxyKubeconfigInjectable, () => async () => mockKubeConfig as any);

      const createKubeApiForClusterId = di.inject(createKubeApiForClusterIdInjectable);
      const result = await createKubeApiForClusterId(clusterId, Pod);

      expect(result).toBeUndefined();
    });

    it("handles kubeconfig with skipTLSVerify", async () => {
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster(clusterId, true);
      clustersState.set(clusterId, cluster);

      // Mock kubeconfig with skipTLSVerify
      const mockKubeConfig = {
        getContextObject: () => ({ cluster: contextName }),
        getCluster: () => ({
          server: proxyServer,
          skipTLSVerify: true,
        }),
      };
      di.override(loadProxyKubeconfigInjectable, () => async () => mockKubeConfig as any);

      let capturedConfig: CreateKubeApiForRemoteClusterConfig | undefined;
      di.override(createKubeApiForRemoteClusterInjectable, () => (config: any) => {
        capturedConfig = config;
        return {} as any;
      });

      const createKubeApiForClusterId = di.inject(createKubeApiForClusterIdInjectable);
      await createKubeApiForClusterId(clusterId, Pod);

      expect(capturedConfig?.cluster.skipTLSVerify).toBe(true);
    });
  });
});
