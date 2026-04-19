/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import createCanIInjectable from "../../common/cluster/create-can-i.injectable";
import createRequestNamespaceListPermissionsInjectable from "../../common/cluster/create-request-namespace-list-permissions.injectable";
import createListNamespacesInjectable from "../../common/cluster/list-namespaces.injectable";
import { ClusterMetadataKey } from "../../common/cluster-types";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import normalizedPlatformInjectable from "../../common/vars/normalized-platform.injectable";
import addClusterInjectable from "../../features/cluster/storage/common/add.injectable";
import clusterVersionDetectorInjectable from "../cluster-detectors/cluster-version-detector.injectable";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import clusterConnectionInjectable from "./cluster-connection.injectable";
import kubeAuthProxyServerInjectable from "./kube-auth-proxy-server.injectable";
import prometheusHandlerInjectable from "./prometheus-handler/prometheus-handler.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import { Kubectl } from "../kubectl/kubectl";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";

import type { Cluster } from "../../common/cluster/cluster";
import type { ClusterConnection } from "./cluster-connection.injectable";
import type { KubeAuthProxyServer } from "./kube-auth-proxy-server.injectable";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";

/**
 * Creates an error object that passes the isRequestError() type guard.
 * isRequestError checks: isObject, instanceof Error, optional statusCode/failed/timedOut.
 */
function createRequestError(opts: { statusCode?: number; failed?: boolean; timedOut?: boolean }): Error {
  const error = new Error("mock request error");

  Object.assign(error, opts);

  return error;
}

describe("ClusterConnection auth failure backoff", () => {
  let cluster: Cluster;
  let clusterConnection: ClusterConnection;
  let detectMock: jest.Mock;
  let broadcastMock: jest.Mock;
  let proxyServerMock: KubeAuthProxyServer;

  beforeEach(() => {
    jest.useFakeTimers();

    const di = getDiForUnitTesting();
    const writeJsonSync = di.inject(writeJsonSyncInjectable);

    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "some-directory-for-temp");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");

    broadcastMock = jest.fn();
    di.override(broadcastConnectionUpdateInjectable, () => broadcastMock);

    di.override(createCanIInjectable, () => () => () => Promise.resolve(true));
    di.override(createRequestNamespaceListPermissionsInjectable, () => () => async () => () => true);
    di.override(createListNamespacesInjectable, () => () => () => Promise.resolve(["default"]));
    di.override(prometheusHandlerInjectable, () => ({
      getPrometheusDetails: jest.fn(),
      setupPrometheus: jest.fn(),
    }));

    proxyServerMock = {
      getApiTarget: jest.fn().mockResolvedValue({}),
      ensureAuthProxyUrl: jest.fn().mockResolvedValue("https://127.0.0.1:9999/test"),
      restart: jest.fn().mockResolvedValue(undefined),
      ensureRunning: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
    };
    di.override(kubeAuthProxyServerInjectable, () => proxyServerMock);

    detectMock = jest.fn();
    di.override(clusterVersionDetectorInjectable, () => ({
      key: ClusterMetadataKey.VERSION,
      detect: detectMock,
    }));

    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    writeJsonSync("/test-kubeconfig.yml", {
      apiVersion: "v1",
      clusters: [{ name: "test-cluster", cluster: { server: "https://192.168.1.1:6443" } }],
      "current-context": "test-cluster",
      contexts: [{ context: { cluster: "test-cluster", user: "test-user" }, name: "test-cluster" }],
      users: [{ name: "test-user" }],
      kind: "Config",
      preferences: {},
    });

    jest.spyOn(Kubectl.prototype, "ensureKubectl").mockReturnValue(Promise.resolve(true));

    const addCluster = di.inject(addClusterInjectable);

    cluster = addCluster({
      id: "test-cluster-id",
      contextName: "test-cluster",
      kubeConfigPath: "/test-kubeconfig.yml",
    });

    clusterConnection = di.inject(clusterConnectionInjectable, cluster);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("when cluster is activated and connected successfully", () => {
    beforeEach(async () => {
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();
      detectMock.mockClear();
    });

    it("should call detect on each 30s refresh tick", async () => {
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

      await jest.advanceTimersByTimeAsync(30_000);

      expect(detectMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(30_000);

      expect(detectMock).toHaveBeenCalledTimes(2);
    });

    describe("when auth fails with 401 (first failure)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

        await jest.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("should not attempt refresh during the 1-minute backoff period", async () => {
        // At 30s after failure - should be in backoff
        await jest.advanceTimersByTimeAsync(30_000);

        expect(detectMock).not.toHaveBeenCalled();
      });

      it("should attempt refresh after the 1-minute backoff expires", async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

        // Advance past the 1-minute backoff (multiple 30s ticks)
        await jest.advanceTimersByTimeAsync(60_000);

        // The timer fires at 30s and 60s, but only the 60s tick should be allowed
        expect(detectMock).toHaveBeenCalledTimes(1);
      });

      it("should broadcast 'Invalid credentials' error", () => {
        expect(broadcastMock).toHaveBeenCalledWith(
          expect.objectContaining({ level: "error", message: "Invalid credentials" }),
        );
      });
    });

    describe("when auth fails with credential fetch failure", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ failed: true }));

        await jest.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("should apply backoff for credential fetch failures", async () => {
        await jest.advanceTimersByTimeAsync(30_000);

        expect(detectMock).not.toHaveBeenCalled();
      });
    });

    describe("when auth fails 3 consecutive times (max retries exceeded)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 403 }));

        // Failure 1 at t=30s
        await jest.advanceTimersByTimeAsync(30_000);

        // Wait for 1-minute backoff to expire, then failure 2
        await jest.advanceTimersByTimeAsync(60_000);

        // Wait for 5-minute backoff to expire, then failure 3
        await jest.advanceTimersByTimeAsync(300_000);

        detectMock.mockClear();
      });

      it("should stop automatic refresh completely", async () => {
        // Advance well past any backoff period
        await jest.advanceTimersByTimeAsync(600_000);

        expect(detectMock).not.toHaveBeenCalled();
      });

      it("should resume refresh after manual reconnect", async () => {
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

        await clusterConnection.reconnect();
        detectMock.mockClear();

        await jest.advanceTimersByTimeAsync(30_000);

        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when auth fails then succeeds", () => {
      beforeEach(async () => {
        // First: auth failure
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));
        await jest.advanceTimersByTimeAsync(30_000);

        // Wait for backoff, then: auth success
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
        await jest.advanceTimersByTimeAsync(60_000);

        detectMock.mockClear();
      });

      it("should reset failure counter and resume normal 30s refresh", async () => {
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

        await jest.advanceTimersByTimeAsync(30_000);

        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when non-auth errors occur (network/timeout)", () => {
      it("should not apply auth backoff for timeout errors", async () => {
        detectMock.mockRejectedValue(createRequestError({ failed: true, timedOut: true }));

        await jest.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();

        // Timeout errors should NOT trigger auth backoff
        detectMock.mockRejectedValue(createRequestError({ failed: true, timedOut: true }));

        await jest.advanceTimersByTimeAsync(30_000);

        // Should still attempt refresh at the normal interval
        expect(detectMock).toHaveBeenCalledTimes(1);
      });

      it("should not apply auth backoff for server errors (5xx)", async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 500 }));

        await jest.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();

        detectMock.mockRejectedValue(createRequestError({ statusCode: 500 }));

        await jest.advanceTimersByTimeAsync(30_000);

        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("concurrent refresh prevention", () => {
      it("should prevent overlapping refresh calls", async () => {
        let resolveDetect!: (value: any) => void;

        detectMock.mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveDetect = resolve;
            }),
        );

        // Trigger first refresh by calling refresh directly
        const refreshPromise = clusterConnection.refresh();

        // Try a second refresh while first is still pending
        const refreshPromise2 = clusterConnection.refresh();

        // Resolve the first detect
        resolveDetect({ value: "v1.28.0", accuracy: 100 });

        await refreshPromise;
        await refreshPromise2;

        // Only one detect call should have been made
        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("when reconnect is called", () => {
    it("should reset auth failure state", async () => {
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();

      // Simulate 3 auth failures to reach max retries
      detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

      await jest.advanceTimersByTimeAsync(30_000); // Failure 1
      await jest.advanceTimersByTimeAsync(60_000); // Failure 2 (after 1min backoff)
      await jest.advanceTimersByTimeAsync(300_000); // Failure 3 (after 5min backoff)

      detectMock.mockClear();

      // Verify refresh has stopped
      await jest.advanceTimersByTimeAsync(30_000);
      expect(detectMock).not.toHaveBeenCalled();

      // Manual reconnect should reset the backoff state
      await clusterConnection.reconnect();
      detectMock.mockClear();

      // Now refresh should work again
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await jest.advanceTimersByTimeAsync(30_000);
      expect(detectMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("when disconnect is called", () => {
    it("should reset auth failure state", async () => {
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();

      // Simulate auth failure
      detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));
      await jest.advanceTimersByTimeAsync(30_000);

      // Disconnect resets tracking
      clusterConnection.disconnect();

      // Re-activate
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate(true);
      detectMock.mockClear();

      // Should refresh normally
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await jest.advanceTimersByTimeAsync(30_000);
      expect(detectMock).toHaveBeenCalledTimes(1);
    });
  });
});
