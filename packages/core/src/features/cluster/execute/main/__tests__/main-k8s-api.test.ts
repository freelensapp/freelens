/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import createKubeJsonApiInjectable from "../../../../../common/k8s-api/create-kube-json-api.injectable";
import loadProxyKubeconfigInjectable from "../../../../../main/cluster/load-proxy-kubeconfig.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import clustersStateInjectable from "../../../storage/common/state.injectable";
import executeOnClusterHandlerInjectable from "../execute-handler.injectable";
import { createMockCluster, createMockKubeJsonApi, createMockProxyKubeconfig, TEST_CLUSTER_CONFIGS } from "../testing";

/**
 * Tests for main process K8s API functions.
 * These test the underlying executeOnClusterHandler which is used directly
 * in the main process without IPC.
 */
describe("Main K8s API functions (direct handler)", () => {
  const { id: clusterId, contextName, proxyServer } = TEST_CLUSTER_CONFIGS.accessible;

  const setupDi = (mockApiConfig: Parameters<typeof createMockKubeJsonApi>[0] = {}) => {
    const di = getDiForUnitTesting();

    const clustersState = di.inject(clustersStateInjectable);
    const cluster = createMockCluster(clusterId, true);
    clustersState.set(clusterId, cluster);

    const mockKubeConfig = createMockProxyKubeconfig({ contextName, server: proxyServer });
    di.override(loadProxyKubeconfigInjectable, () => async () => mockKubeConfig as any);
    di.override(createKubeJsonApiInjectable, () => () => createMockKubeJsonApi(mockApiConfig) as any);

    return di;
  };

  describe("queryCluster behavior", () => {
    it("should list resources successfully", async () => {
      const mockPods = {
        kind: "PodList",
        apiVersion: "v1",
        items: [{ metadata: { name: "pod-1" } }, { metadata: { name: "pod-2" } }],
      };

      const di = setupDi({ get: jest.fn().mockResolvedValue(mockPods) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPods);
    });
  });

  describe("getResource behavior", () => {
    it("should get a single resource", async () => {
      const mockPod = { metadata: { name: "my-pod", namespace: "default" } };

      const di = setupDi({ get: jest.fn().mockResolvedValue(mockPod) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "get",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPod);
    });
  });

  describe("applyOnCluster behavior (create/update)", () => {
    it("should create a resource", async () => {
      const mockCreated = { metadata: { name: "new-config", namespace: "default", uid: "new-uid" } };

      const di = setupDi({ post: jest.fn().mockResolvedValue(mockCreated) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "create",
        resource: { apiVersion: "v1", kind: "ConfigMap", namespace: "default" },
        body: { metadata: { name: "new-config" }, data: { key: "value" } },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCreated);
    });

    it("should update an existing resource", async () => {
      const mockUpdated = { metadata: { name: "my-config", namespace: "default" }, data: { key: "new-value" } };

      const di = setupDi({ put: jest.fn().mockResolvedValue(mockUpdated) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "update",
        resource: { apiVersion: "v1", kind: "ConfigMap", namespace: "default", name: "my-config" },
        body: { metadata: { name: "my-config" }, data: { key: "new-value" } },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUpdated);
    });
  });

  describe("deleteOnCluster behavior", () => {
    it("should delete a resource", async () => {
      const di = setupDi({ del: jest.fn().mockResolvedValue({ status: "Success" }) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "delete",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
      });

      expect(response.success).toBe(true);
    });
  });

  describe("patchOnCluster behavior", () => {
    it("should patch with strategic merge", async () => {
      const mockPatched = { metadata: { name: "my-deploy" }, spec: { replicas: 5 } };

      const di = setupDi({ patch: jest.fn().mockResolvedValue(mockPatched) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "patch",
        resource: { apiVersion: "apps/v1", kind: "Deployment", namespace: "default", name: "my-deploy" },
        body: { spec: { replicas: 5 } },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockPatched);
    });

    it("should patch with JSON patch", async () => {
      const di = setupDi({ patch: jest.fn().mockResolvedValue({}) });
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId,
        operation: "patch",
        resource: { apiVersion: "v1", kind: "ConfigMap", namespace: "default", name: "my-config" },
        body: [{ op: "replace", path: "/data/key", value: "new-value" }],
        patchType: "json",
      });

      expect(response.success).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return error for inaccessible cluster", async () => {
      const di = getDiForUnitTesting();
      const clustersState = di.inject(clustersStateInjectable);
      const inaccessibleCluster = createMockCluster("inaccessible", false);
      clustersState.set("inaccessible", inaccessibleCluster);

      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId: "inaccessible",
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod" },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(503);
    });

    it("should return error for non-existent cluster", async () => {
      const di = getDiForUnitTesting();
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const response = await executeHandler({
        clusterId: "non-existent",
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod" },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(503);
    });
  });
});
