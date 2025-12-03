/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { runInAction } from "mobx";
import { KubernetesCluster } from "../../../../../common/catalog-entities/kubernetes-cluster";
import catalogEntityRegistryInjectable from "../../../../../renderer/api/catalog/entity/registry.injectable";
import { getDiForUnitTesting } from "../../../../../renderer/getDiForUnitTesting";
import executeOnClusterInjectable from "../execute-on-cluster.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CatalogEntityRegistry } from "../../../../../renderer/api/catalog/entity/registry";
import type { ExecuteOnClusterResponse } from "../../common/types";

// We need to test the K8s API functions, but they use asLegacyGlobalFunctionForExtensionApi
// which requires global DI setup. For unit tests, we test the underlying injectable directly.
// Integration tests would cover the full API surface.

describe("K8s extension API functions (via injectable)", () => {
  let di: DiContainer;
  let requestFromChannelMock: jest.Mock;
  let catalogEntityRegistry: CatalogEntityRegistry;

  const createMockCluster = (id: string, status: "connected" | "disconnected") => {
    const cluster = new KubernetesCluster({
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

    return cluster;
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    requestFromChannelMock = jest.fn();
    di.override(requestFromChannelInjectionToken, () => requestFromChannelMock);

    catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
  });

  describe("queryCluster behavior", () => {
    it("should extract items from list response", async () => {
      const mockPods = [{ metadata: { name: "pod-1" } }, { metadata: { name: "pod-2" } }];
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { items: mockPods },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod" },
      });

      expect(response.success).toBe(true);
      expect((response.data as { items: unknown[] }).items).toEqual(mockPods);
    });

    it("should handle empty list response", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { items: [] },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod" },
      });

      expect(response.success).toBe(true);
      expect((response.data as { items: unknown[] }).items).toEqual([]);
    });
  });

  describe("getResource behavior", () => {
    it("should return single resource data", async () => {
      const mockPod = { metadata: { name: "my-pod", namespace: "default" } };
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: mockPod,
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPod);
    });

    it("should return 404 error for not found", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: false,
        error: {
          message: 'pods "nonexistent" not found',
          code: 404,
          reason: "NotFound",
        },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "nonexistent" },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(404);
    });
  });

  describe("queryClusters behavior (parallel execution)", () => {
    it("should query multiple clusters in parallel", async () => {
      // Simulate different responses for different clusters
      requestFromChannelMock
        .mockResolvedValueOnce({
          success: true,
          data: { items: [{ metadata: { name: "pod-1" } }] },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { items: [{ metadata: { name: "pod-2" } }] },
        });

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      // Simulate parallel queries
      const results = await Promise.all([
        executeOnCluster({
          clusterId: "cluster-1",
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod" },
        }),
        executeOnCluster({
          clusterId: "cluster-2",
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod" },
        }),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(requestFromChannelMock).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed success and failure in parallel queries", async () => {
      requestFromChannelMock
        .mockResolvedValueOnce({
          success: true,
          data: { items: [{ metadata: { name: "pod-1" } }] },
        })
        .mockResolvedValueOnce({
          success: false,
          error: { message: "Cluster not available", code: 503 },
        });

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const results = await Promise.all([
        executeOnCluster({
          clusterId: "cluster-1",
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod" },
        }),
        executeOnCluster({
          clusterId: "cluster-2",
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod" },
        }),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.code).toBe(503);
    });
  });

  describe("queryAllClusters behavior", () => {
    it("should filter to connected clusters only", () => {
      // Add clusters to the registry
      runInAction(() => {
        catalogEntityRegistry.updateItems([
          createMockCluster("connected-1", "connected"),
          createMockCluster("disconnected-1", "disconnected"),
          createMockCluster("connected-2", "connected"),
        ]);
      });

      // Get connected clusters
      const allEntities = catalogEntityRegistry.getItemsForApiKind<KubernetesCluster>(
        KubernetesCluster.apiVersion,
        KubernetesCluster.kind,
      );

      const connectedClusters = allEntities.filter((c) => c.status.phase === "connected");

      expect(connectedClusters).toHaveLength(2);
      expect(connectedClusters.map((c) => c.getId())).toEqual(["connected-1", "connected-2"]);
    });
  });
});
