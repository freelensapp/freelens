/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getDiForUnitTesting } from "../../../../../renderer/getDiForUnitTesting";
import { executeOnClusterChannel } from "../../common/channels";
import executeOnClusterInjectable from "../execute-on-cluster.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ExecuteOnClusterResponse } from "../../common/types";

describe("executeOnCluster", () => {
  let di: DiContainer;
  let requestFromChannelMock: jest.Mock;

  beforeEach(() => {
    di = getDiForUnitTesting();

    requestFromChannelMock = jest.fn();
    di.override(requestFromChannelInjectionToken, () => requestFromChannelMock);
  });

  describe("list operation", () => {
    it("should send list request via IPC channel", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { items: [{ metadata: { name: "pod-1" } }] },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "list",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
        },
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(executeOnClusterChannel, {
        clusterId: "cluster-1",
        operation: "list",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it("should pass label selector in list request", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { items: [] },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      await executeOnCluster({
        clusterId: "cluster-1",
        operation: "list",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          labelSelector: "app=nginx",
        },
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(
        executeOnClusterChannel,
        expect.objectContaining({
          resource: expect.objectContaining({
            labelSelector: "app=nginx",
          }),
        }),
      );
    });
  });

  describe("get operation", () => {
    it("should send get request via IPC channel", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { metadata: { name: "my-pod" } },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "my-pod",
        },
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(executeOnClusterChannel, {
        clusterId: "cluster-1",
        operation: "get",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "my-pod",
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("create operation", () => {
    it("should send create request with body via IPC channel", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { metadata: { name: "new-pod", uid: "abc-123" } },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);
      const body = {
        apiVersion: "v1",
        kind: "Pod",
        metadata: { name: "new-pod", namespace: "default" },
        spec: { containers: [{ name: "nginx", image: "nginx:latest" }] },
      };

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "create",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
        },
        body,
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(executeOnClusterChannel, {
        clusterId: "cluster-1",
        operation: "create",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
        },
        body,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("patch operation", () => {
    it("should send patch request with patch type via IPC channel", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
        data: { metadata: { name: "my-pod" } },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);
      const patch = [{ op: "replace", path: "/spec/replicas", value: 3 }];

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: patch,
        patchType: "json",
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(executeOnClusterChannel, {
        clusterId: "cluster-1",
        operation: "patch",
        resource: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          namespace: "default",
          name: "my-deployment",
        },
        body: patch,
        patchType: "json",
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("delete operation", () => {
    it("should send delete request via IPC channel", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: true,
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "my-pod",
        },
      });

      expect(requestFromChannelMock).toHaveBeenCalledWith(executeOnClusterChannel, {
        clusterId: "cluster-1",
        operation: "delete",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "my-pod",
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("error handling", () => {
    it("should return error response for inaccessible cluster", async () => {
      const mockResponse: ExecuteOnClusterResponse = {
        success: false,
        error: {
          message: "Cluster not available. Ensure cluster is connected.",
          code: 503,
          reason: "ClusterNotAccessible",
        },
      };
      requestFromChannelMock.mockResolvedValue(mockResponse);

      const executeOnCluster = di.inject(executeOnClusterInjectable);

      const result = await executeOnCluster({
        clusterId: "disconnected-cluster",
        operation: "list",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(503);
      expect(result.error?.reason).toBe("ClusterNotAccessible");
    });

    it("should return error response for not found resource", async () => {
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

      const result = await executeOnCluster({
        clusterId: "cluster-1",
        operation: "get",
        resource: {
          apiVersion: "v1",
          kind: "Pod",
          namespace: "default",
          name: "nonexistent",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(404);
      expect(result.error?.reason).toBe("NotFound");
    });
  });
});
