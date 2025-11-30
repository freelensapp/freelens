/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import createKubeJsonApiInjectable from "../../../../../common/k8s-api/create-kube-json-api.injectable";
import loadProxyKubeconfigInjectable from "../../../../../main/cluster/load-proxy-kubeconfig.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import clustersStateInjectable from "../../../storage/common/state.injectable";
import {
  createMockCluster,
  createMockKubeJsonApi,
  createMockProxyKubeconfig,
  TEST_CLUSTER_CONFIGS,
} from "../../test-helpers";
import executeOnClusterHandlerInjectable from "../execute-handler.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ExecuteOnClusterRequest } from "../../common/types";

describe("executeOnClusterHandler", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  describe("when cluster does not exist", () => {
    it("returns error with 503 code", async () => {
      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const request: ExecuteOnClusterRequest = {
        clusterId: "non-existent",
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
      };

      const result = await executeHandler(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(503);
      expect(result.error?.reason).toBe("ClusterNotAccessible");
    });
  });

  describe("when cluster exists but is not accessible", () => {
    it("returns error with 503 code", async () => {
      const { id } = TEST_CLUSTER_CONFIGS.inaccessible;
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster(id, false);
      clustersState.set(id, cluster);

      const executeHandler = di.inject(executeOnClusterHandlerInjectable);

      const request: ExecuteOnClusterRequest = {
        clusterId: id,
        operation: "list",
        resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
      };

      const result = await executeHandler(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(503);
      expect(result.error?.reason).toBe("ClusterNotAccessible");
    });
  });

  describe("when cluster is accessible", () => {
    const { id: clusterId, contextName, proxyServer } = TEST_CLUSTER_CONFIGS.accessible;

    beforeEach(() => {
      const clustersState = di.inject(clustersStateInjectable);
      const cluster = createMockCluster(clusterId, true);
      clustersState.set(clusterId, cluster);

      const mockKubeConfig = createMockProxyKubeconfig({ contextName, server: proxyServer });
      di.override(loadProxyKubeconfigInjectable, () => async () => mockKubeConfig as any);
    });

    describe("list operation", () => {
      it("makes GET request and returns data on success", async () => {
        const mockPods = {
          kind: "PodList",
          apiVersion: "v1",
          items: [{ metadata: { name: "pod-1" } }, { metadata: { name: "pod-2" } }],
        };

        di.override(
          createKubeJsonApiInjectable,
          () => () => createMockKubeJsonApi({ get: jest.fn().mockResolvedValue(mockPods) }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const request: ExecuteOnClusterRequest = {
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
        };

        const result = await executeHandler(request);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPods);
      });

      it("constructs correct URL for core v1 resources", async () => {
        let capturedUrl: string | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((url: string) => {
                capturedUrl = url;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
        });

        expect(capturedUrl).toBe("/api/v1/namespaces/default/pods");
      });

      it("constructs correct URL for apps/v1 resources", async () => {
        let capturedUrl: string | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((url: string) => {
                capturedUrl = url;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "apps/v1", kind: "Deployment", namespace: "kube-system" },
        });

        expect(capturedUrl).toBe("/apis/apps/v1/namespaces/kube-system/deployments");
      });

      it("constructs correct URL for cluster-scoped resources", async () => {
        let capturedUrl: string | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((url: string) => {
                capturedUrl = url;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Node" },
        });

        expect(capturedUrl).toBe("/api/v1/nodes");
      });
    });

    describe("get operation", () => {
      it("makes GET request with resource name", async () => {
        const mockPod = { metadata: { name: "my-pod", namespace: "default" } };
        let capturedUrl: string | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((url: string) => {
                capturedUrl = url;
                return Promise.resolve(mockPod);
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const result = await executeHandler({
          clusterId,
          operation: "get",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPod);
        expect(capturedUrl).toBe("/api/v1/namespaces/default/pods/my-pod");
      });
    });

    describe("create operation", () => {
      it("makes POST request with body", async () => {
        const mockCreatedPod = { metadata: { name: "new-pod", namespace: "default" } };
        let capturedUrl: string | undefined;
        let capturedBody: unknown;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              post: jest.fn().mockImplementation((url: string, params: any) => {
                capturedUrl = url;
                capturedBody = params?.data;
                return Promise.resolve(mockCreatedPod);
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);
        const body = { metadata: { name: "new-pod" }, spec: { containers: [] } };

        const result = await executeHandler({
          clusterId,
          operation: "create",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
          body,
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCreatedPod);
        expect(capturedUrl).toBe("/api/v1/namespaces/default/pods");
        expect(capturedBody).toEqual(body);
      });
    });

    describe("update operation", () => {
      it("makes PUT request with body", async () => {
        const mockUpdatedPod = { metadata: { name: "my-pod", namespace: "default" } };
        let capturedUrl: string | undefined;
        let capturedBody: unknown;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              put: jest.fn().mockImplementation((url: string, params: any) => {
                capturedUrl = url;
                capturedBody = params?.data;
                return Promise.resolve(mockUpdatedPod);
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);
        const body = { metadata: { name: "my-pod" }, spec: { containers: [] } };

        const result = await executeHandler({
          clusterId,
          operation: "update",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
          body,
        });

        expect(result.success).toBe(true);
        expect(capturedUrl).toBe("/api/v1/namespaces/default/pods/my-pod");
        expect(capturedBody).toEqual(body);
      });
    });

    describe("patch operation", () => {
      it("makes PATCH request with strategic merge by default", async () => {
        const mockPatchedPod = { metadata: { name: "my-pod" } };
        let capturedUrl: string | undefined;
        let capturedBody: unknown;
        let capturedHeaders: Record<string, string> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              patch: jest.fn().mockImplementation((url: string, params: any, reqInit: any) => {
                capturedUrl = url;
                capturedBody = params?.data;
                capturedHeaders = reqInit?.headers;
                return Promise.resolve(mockPatchedPod);
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);
        const patch = { spec: { replicas: 3 } };

        const result = await executeHandler({
          clusterId,
          operation: "patch",
          resource: { apiVersion: "apps/v1", kind: "Deployment", namespace: "default", name: "my-deploy" },
          body: patch,
        });

        expect(result.success).toBe(true);
        expect(capturedUrl).toBe("/apis/apps/v1/namespaces/default/deployments/my-deploy");
        expect(capturedBody).toEqual(patch);
        expect(capturedHeaders?.["content-type"]).toBe("application/strategic-merge-patch+json");
      });

      it("uses specified patch type", async () => {
        let capturedHeaders: Record<string, string> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              patch: jest.fn().mockImplementation((_url: string, _params: any, reqInit: any) => {
                capturedHeaders = reqInit?.headers;
                return Promise.resolve({});
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "patch",
          resource: { apiVersion: "v1", kind: "ConfigMap", namespace: "default", name: "my-config" },
          body: [{ op: "replace", path: "/data/key", value: "new-value" }],
          patchType: "json",
        });

        expect(capturedHeaders?.["content-type"]).toBe("application/json-patch+json");
      });

      it("uses merge patch type when specified", async () => {
        let capturedHeaders: Record<string, string> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              patch: jest.fn().mockImplementation((_url: string, _params: any, reqInit: any) => {
                capturedHeaders = reqInit?.headers;
                return Promise.resolve({});
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "patch",
          resource: { apiVersion: "v1", kind: "ConfigMap", namespace: "default", name: "my-config" },
          body: { data: { key: "value" } },
          patchType: "merge",
        });

        expect(capturedHeaders?.["content-type"]).toBe("application/merge-patch+json");
      });
    });

    describe("delete operation", () => {
      it("makes DELETE request", async () => {
        let capturedUrl: string | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              del: jest.fn().mockImplementation((url: string) => {
                capturedUrl = url;
                return Promise.resolve({});
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const result = await executeHandler({
          clusterId,
          operation: "delete",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "my-pod" },
        });

        expect(result.success).toBe(true);
        expect(capturedUrl).toBe("/api/v1/namespaces/default/pods/my-pod");
      });
    });

    describe("unknown operation", () => {
      it("returns error for unsupported operation", async () => {
        di.override(createKubeJsonApiInjectable, () => () => createMockKubeJsonApi() as any);

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const result = await executeHandler({
          clusterId,
          operation: "unsupported" as any,
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default" },
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(400);
        expect(result.error?.reason).toBe("BadRequest");
        expect(result.error?.message).toContain("Unknown operation");
      });
    });

    describe("error handling", () => {
      it("returns error response when API call fails", async () => {
        const apiError = {
          message: 'pods "not-found" not found',
          code: 404,
          reason: "NotFound",
        };

        di.override(
          createKubeJsonApiInjectable,
          () => () => createMockKubeJsonApi({ get: jest.fn().mockRejectedValue(apiError) }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const result = await executeHandler({
          clusterId,
          operation: "get",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", name: "not-found" },
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('pods "not-found" not found');
        expect(result.error?.code).toBe(404);
        expect(result.error?.reason).toBe("NotFound");
      });

      it("handles unknown errors gracefully", async () => {
        di.override(
          createKubeJsonApiInjectable,
          () => () => createMockKubeJsonApi({ get: jest.fn().mockRejectedValue(new Error("Network error")) }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        const result = await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod" },
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe("Network error");
      });
    });

    describe("label and field selectors", () => {
      it("passes labelSelector as query parameter", async () => {
        let capturedQuery: Record<string, unknown> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((_url: string, params: any) => {
                capturedQuery = params?.query;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", labelSelector: "app=nginx" },
        });

        expect(capturedQuery?.labelSelector).toBe("app=nginx");
      });

      it("passes fieldSelector as query parameter", async () => {
        let capturedQuery: Record<string, unknown> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((_url: string, params: any) => {
                capturedQuery = params?.query;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: { apiVersion: "v1", kind: "Pod", namespace: "default", fieldSelector: "status.phase=Running" },
        });

        expect(capturedQuery?.fieldSelector).toBe("status.phase=Running");
      });

      it("passes both selectors when provided", async () => {
        let capturedQuery: Record<string, unknown> | undefined;

        di.override(
          createKubeJsonApiInjectable,
          () => () =>
            createMockKubeJsonApi({
              get: jest.fn().mockImplementation((_url: string, params: any) => {
                capturedQuery = params?.query;
                return Promise.resolve({ items: [] });
              }),
            }) as any,
        );

        const executeHandler = di.inject(executeOnClusterHandlerInjectable);

        await executeHandler({
          clusterId,
          operation: "list",
          resource: {
            apiVersion: "v1",
            kind: "Pod",
            namespace: "default",
            labelSelector: "app=nginx",
            fieldSelector: "status.phase=Running",
          },
        });

        expect(capturedQuery?.labelSelector).toBe("app=nginx");
        expect(capturedQuery?.fieldSelector).toBe("status.phase=Running");
      });
    });
  });
});
