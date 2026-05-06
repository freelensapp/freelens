/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getDiForUnitTesting } from "../../../../../renderer/getDiForUnitTesting";
import executeOnClusterInjectable from "../execute-on-cluster.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "../../common/types";

/**
 * Tests for K8s mutation functions: applyOnCluster, deleteOnCluster, patchOnCluster
 * These test the underlying executeOnCluster injectable which powers the K8s API mutations.
 */
describe("K8s mutation functions (via injectable)", () => {
  let di: DiContainer;
  let requestFromChannelMock: jest.Mock;
  let executeOnCluster: (request: ExecuteOnClusterRequest) => Promise<ExecuteOnClusterResponse>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    requestFromChannelMock = jest.fn();
    di.override(requestFromChannelInjectionToken, () => requestFromChannelMock);

    executeOnCluster = di.inject(executeOnClusterInjectable);
  });

  describe("applyOnCluster behavior (create or update)", () => {
    const mockManifest = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "my-config",
        namespace: "default",
      },
      data: {
        key: "value",
      },
    };

    it("should create resource when it does not exist", async () => {
      const createdResource = { ...mockManifest, metadata: { ...mockManifest.metadata, uid: "new-uid" } };

      // First call (get) returns 404, second call (create) succeeds
      requestFromChannelMock
        .mockResolvedValueOnce({
          success: false,
          error: { message: "Not found", code: 404, reason: "NotFound" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: createdResource,
        });

      // Simulate applyOnCluster: first try get, if 404 then create
      const getResponse = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: {
          apiVersion: mockManifest.apiVersion,
          kind: mockManifest.kind,
          namespace: mockManifest.metadata.namespace,
          name: mockManifest.metadata.name,
        },
      });

      expect(getResponse.success).toBe(false);
      expect(getResponse.error?.code).toBe(404);

      const createResponse = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "create",
        resource: {
          apiVersion: mockManifest.apiVersion,
          kind: mockManifest.kind,
          namespace: mockManifest.metadata.namespace,
        },
        body: mockManifest,
      });

      expect(createResponse.success).toBe(true);
      expect(createResponse.data).toEqual(createdResource);
    });

    it("should update resource when it already exists", async () => {
      const existingResource = { ...mockManifest, metadata: { ...mockManifest.metadata, uid: "existing-uid" } };
      const updatedResource = { ...existingResource, data: { key: "new-value" } };

      // First call (get) finds resource, second call (update) succeeds
      requestFromChannelMock
        .mockResolvedValueOnce({
          success: true,
          data: existingResource,
        })
        .mockResolvedValueOnce({
          success: true,
          data: updatedResource,
        });

      // Simulate applyOnCluster: first try get, if found then update
      const getResponse = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: {
          apiVersion: mockManifest.apiVersion,
          kind: mockManifest.kind,
          namespace: mockManifest.metadata.namespace,
          name: mockManifest.metadata.name,
        },
      });

      expect(getResponse.success).toBe(true);

      const updateManifest = { ...mockManifest, data: { key: "new-value" } };
      const updateResponse = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "update",
        resource: {
          apiVersion: mockManifest.apiVersion,
          kind: mockManifest.kind,
          namespace: mockManifest.metadata.namespace,
          name: mockManifest.metadata.name,
        },
        body: updateManifest,
      });

      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data).toEqual(updatedResource);
    });

    it("should propagate errors from cluster", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: false,
        error: { message: "Forbidden", code: 403, reason: "Forbidden" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "create",
        resource: {
          apiVersion: "v1",
          kind: "ConfigMap",
          namespace: "default",
        },
        body: mockManifest,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(403);
      expect(response.error?.reason).toBe("Forbidden");
    });
  });

  describe("deleteOnCluster behavior", () => {
    it("should delete a resource successfully", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: true,
        data: { kind: "Status", status: "Success" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "my-pod",
        },
      });

      expect(response.success).toBe(true);
      expect(requestFromChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          clusterId: "cluster-1",
          operation: "delete",
          resource: expect.objectContaining({
            apiVersion: "v1",
            kind: "Pod",
            namespace: "default",
            name: "my-pod",
          }),
        }),
      );
    });

    it("should handle 404 when resource already deleted", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: false,
        error: { message: "Not found", code: 404, reason: "NotFound" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "nonexistent-pod",
        },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(404);
    });

    it("should handle cluster-scoped resource deletion", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: true,
        data: { kind: "Status", status: "Success" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Node",
          name: "my-node",
        },
      });

      expect(response.success).toBe(true);
      expect(requestFromChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          resource: expect.objectContaining({
            apiVersion: "v1",
            kind: "Node",
            name: "my-node",
          }),
        }),
      );
    });

    it("should propagate permission errors", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: false,
        error: { message: "Forbidden", code: 403, reason: "Forbidden" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "kube-system",
          name: "protected-pod",
        },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(403);
    });
  });

  describe("patchOnCluster behavior", () => {
    it("should patch with strategic merge by default", async () => {
      const patchedResource = {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: { name: "my-deployment", namespace: "default" },
        spec: { replicas: 5 },
      };

      requestFromChannelMock.mockResolvedValue({
        success: true,
        data: patchedResource,
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: { spec: { replicas: 5 } },
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(patchedResource);
      expect(requestFromChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operation: "patch",
          body: { spec: { replicas: 5 } },
        }),
      );
    });

    it("should support JSON patch type", async () => {
      const jsonPatch = [
        { op: "replace", path: "/spec/replicas", value: 3 },
        { op: "add", path: "/metadata/labels/patched", value: "true" },
      ];

      requestFromChannelMock.mockResolvedValue({
        success: true,
        data: { metadata: { name: "my-deployment" } },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: jsonPatch,
        patchType: "json",
      });

      expect(response.success).toBe(true);
      expect(requestFromChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operation: "patch",
          body: jsonPatch,
          patchType: "json",
        }),
      );
    });

    it("should support merge patch type", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: true,
        data: { metadata: { name: "my-config" } },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "v1",
          kind: "ConfigMap",
          namespace: "default",
          name: "my-config",
        },
        body: { data: { newKey: "newValue" } },
        patchType: "merge",
      });

      expect(response.success).toBe(true);
      expect(requestFromChannelMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          patchType: "merge",
        }),
      );
    });

    it("should handle conflict errors", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: false,
        error: { message: "Conflict", code: 409, reason: "Conflict" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: { spec: { replicas: 5 } },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(409);
      expect(response.error?.reason).toBe("Conflict");
    });

    it("should handle validation errors", async () => {
      requestFromChannelMock.mockResolvedValue({
        success: false,
        error: { message: "Invalid value", code: 422, reason: "Invalid" },
      });

      const response = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: { spec: { replicas: -1 } }, // Invalid value
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe(422);
    });
  });
});
