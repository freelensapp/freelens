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
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import kubectlBinaryNameInjectable from "../kubectl/binary-name.injectable";
import { Kubectl } from "../kubectl/kubectl";
import kubectlDownloadingNormalizedArchInjectable from "../kubectl/normalized-arch.injectable";
import broadcastConnectionUpdateInjectable from "./broadcast-connection-update.injectable";
import clusterConnectionInjectable from "./cluster-connection.injectable";
import kubeAuthProxyServerInjectable from "./kube-auth-proxy-server.injectable";
import prometheusHandlerInjectable from "./prometheus-handler/prometheus-handler.injectable";

import type { Mock } from "vitest";

import type { Cluster } from "../../common/cluster/cluster";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";
import type { ClusterConnection } from "./cluster-connection.injectable";
import type { KubeAuthProxyServer } from "./kube-auth-proxy-server.injectable";

/**
 * Creates an error object that passes the isRequestError() type guard, like the
 * errors thrown by k8sRequest (statusCode + body in `error`) or by the legacy
 * request helpers (failed / timedOut).
 */
function createRequestError(opts: {
  statusCode?: number;
  failed?: boolean;
  timedOut?: boolean;
  error?: string;
  message?: string;
}): Error {
  const { message = "mock request error", ...rest } = opts;
  const error = new Error(message);

  Object.assign(error, rest);

  return error;
}

const credentialPluginFailure = "getting credentials: exec: executable kubelogin failed with exit code 1";
const dialFailure = "dial tcp 10.0.0.1:6443: connect: connection refused";
const requestTimeout = "Operation timed out: timeout 30 seconds";

describe("ClusterConnection auth failure backoff", () => {
  let cluster: Cluster;
  let clusterConnection: ClusterConnection;
  let detectMock: Mock;
  let broadcastMock: Mock;
  let proxyServerMock: KubeAuthProxyServer;

  const setup = ({ execPlugin = false } = {}) => {
    vi.useFakeTimers();

    const di = getDiForUnitTesting();
    const writeJsonSync = di.inject(writeJsonSyncInjectable);

    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "some-directory-for-temp");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");

    broadcastMock = vi.fn();
    di.override(broadcastConnectionUpdateInjectable, () => broadcastMock);

    di.override(createCanIInjectable, () => () => () => Promise.resolve(true));
    di.override(createRequestNamespaceListPermissionsInjectable, () => () => async () => () => true);
    di.override(createListNamespacesInjectable, () => () => () => Promise.resolve(["default"]));
    di.override(prometheusHandlerInjectable, () => ({
      getPrometheusDetails: vi.fn(),
      setupPrometheus: vi.fn(),
    }));

    proxyServerMock = {
      getApiTarget: vi.fn().mockResolvedValue({}),
      ensureAuthProxyUrl: vi.fn().mockResolvedValue("https://127.0.0.1:9999/test"),
      restart: vi.fn().mockResolvedValue(undefined),
      ensureRunning: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };
    di.override(kubeAuthProxyServerInjectable, () => proxyServerMock);

    detectMock = vi.fn();
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
      users: [
        {
          name: "test-user",
          user: execPlugin
            ? { exec: { apiVersion: "client.authentication.k8s.io/v1", command: "kubelogin", args: ["get-token"] } }
            : {},
        },
      ],
      kind: "Config",
      preferences: {},
    });

    vi.spyOn(Kubectl.prototype, "ensureKubectl").mockReturnValue(Promise.resolve(true));

    const addCluster = di.inject(addClusterInjectable);

    cluster = addCluster({
      id: "test-cluster-id",
      contextName: "test-cluster",
      kubeConfigPath: "/test-kubeconfig.yml",
    });

    clusterConnection = di.inject(clusterConnectionInjectable, cluster);
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when cluster is activated and connected successfully", () => {
    beforeEach(async () => {
      setup();
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();
      detectMock.mockClear();
    });

    it("should call detect on each 30s refresh tick", async () => {
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

      await vi.advanceTimersByTimeAsync(30_000);

      expect(detectMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(30_000);

      expect(detectMock).toHaveBeenCalledTimes(2);
    });

    describe("when auth fails with 401 (first failure)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("should not attempt refresh during the 1-minute backoff period", async () => {
        // At 30s after failure - should be in backoff
        await vi.advanceTimersByTimeAsync(30_000);

        expect(detectMock).not.toHaveBeenCalled();
      });

      it("should attempt refresh after the 1-minute backoff expires", async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

        // Advance past the 1-minute backoff (multiple 30s ticks)
        await vi.advanceTimersByTimeAsync(60_000);

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

        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("should apply backoff for credential fetch failures", async () => {
        await vi.advanceTimersByTimeAsync(30_000);

        expect(detectMock).not.toHaveBeenCalled();
      });
    });

    describe("when the proxy reports a credential plugin failure (500 with the client-go body)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 500, error: credentialPluginFailure }));
        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("broadcasts the failure with the reason of the proxy", () => {
        expect(broadcastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "error",
            message: `Failed to fetch credentials: ${credentialPluginFailure}`,
          }),
        );
      });

      it("does not attempt a refresh during the 1-minute backoff period", async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).not.toHaveBeenCalled();
      });
    });

    describe("when the proxy reports another server error (500 with a dial failure)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 500, error: dialFailure }));
        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("broadcasts the reason of the proxy", () => {
        expect(broadcastMock).toHaveBeenCalledWith(expect.objectContaining({ level: "error", message: dialFailure }));
      });

      it("keeps refreshing at the normal interval", async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when the request times out (abort reason of k8sRequest)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(requestTimeout);
        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("broadcasts a plain timeout", () => {
        expect(broadcastMock).toHaveBeenCalledWith(
          expect.objectContaining({ level: "error", message: "Connection timed out" }),
        );
      });

      it("keeps refreshing at the normal interval", async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when the third consecutive auth failure pauses the automatic refresh", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));
        await vi.advanceTimersByTimeAsync(30_000);
        await vi.advanceTimersByTimeAsync(60_000);
        await vi.advanceTimersByTimeAsync(300_000);
      });

      it("tells the user that the automatic reconnection is paused", () => {
        expect(broadcastMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            level: "error",
            message: "Authentication failed 3 times, automatic reconnection paused: reconnect to try again",
          }),
        );
      });
    });

    describe("when auth fails 3 consecutive times (max retries exceeded)", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 403 }));

        // Failure 1 at t=30s
        await vi.advanceTimersByTimeAsync(30_000);

        // Wait for 1-minute backoff to expire, then failure 2
        await vi.advanceTimersByTimeAsync(60_000);

        // Wait for 5-minute backoff to expire, then failure 3
        await vi.advanceTimersByTimeAsync(300_000);

        detectMock.mockClear();
      });

      it("should stop automatic refresh completely", async () => {
        // Advance well past any backoff period
        await vi.advanceTimersByTimeAsync(600_000);

        expect(detectMock).not.toHaveBeenCalled();
      });

      it("should resume refresh after manual reconnect", async () => {
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

        await clusterConnection.reconnect();
        detectMock.mockClear();

        await vi.advanceTimersByTimeAsync(30_000);

        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when auth fails then succeeds", () => {
      beforeEach(async () => {
        // First: auth failure
        detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));
        await vi.advanceTimersByTimeAsync(30_000);

        // Wait for backoff, then: auth success
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
        await vi.advanceTimersByTimeAsync(60_000);

        detectMock.mockClear();
      });

      it("should reset failure counter and resume normal 30s refresh", async () => {
        detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });

        await vi.advanceTimersByTimeAsync(30_000);

        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when non-auth errors occur (network/timeout)", () => {
      it("should not apply auth backoff for timeout errors", async () => {
        detectMock.mockRejectedValue(createRequestError({ failed: true, timedOut: true }));

        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();

        // Timeout errors should NOT trigger auth backoff
        detectMock.mockRejectedValue(createRequestError({ failed: true, timedOut: true }));

        await vi.advanceTimersByTimeAsync(30_000);

        // Should still attempt refresh at the normal interval
        expect(detectMock).toHaveBeenCalledTimes(1);
      });

      it("should not apply auth backoff for server errors (5xx)", async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 500 }));

        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();

        detectMock.mockRejectedValue(createRequestError({ statusCode: 500 }));

        await vi.advanceTimersByTimeAsync(30_000);

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

  describe("given a cluster whose user authenticates with an exec credential plugin", () => {
    beforeEach(async () => {
      setup({ execPlugin: true });
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();
      detectMock.mockClear();
    });

    describe("when the request times out", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(requestTimeout);
        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("tells the user that the credential plugin may be waiting for a login", () => {
        expect(broadcastMock).toHaveBeenCalledWith(
          expect.objectContaining({
            level: "error",
            message: "Connection timed out, the credential plugin may be waiting for an interactive login",
          }),
        );
      });

      it("backs off like an authentication failure", async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when the proxy reports a server error that is not about credentials", () => {
      beforeEach(async () => {
        detectMock.mockRejectedValue(createRequestError({ statusCode: 500, error: dialFailure }));
        await vi.advanceTimersByTimeAsync(30_000);
        detectMock.mockClear();
      });

      it("keeps refreshing at the normal interval", async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        expect(detectMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("when reconnect is called", () => {
    it("should reset auth failure state", async () => {
      setup();
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();

      // Simulate 3 auth failures to reach max retries
      detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));

      await vi.advanceTimersByTimeAsync(30_000); // Failure 1
      await vi.advanceTimersByTimeAsync(60_000); // Failure 2 (after 1min backoff)
      await vi.advanceTimersByTimeAsync(300_000); // Failure 3 (after 5min backoff)

      detectMock.mockClear();

      // Verify refresh has stopped
      await vi.advanceTimersByTimeAsync(30_000);
      expect(detectMock).not.toHaveBeenCalled();

      // Manual reconnect should reset the backoff state
      await clusterConnection.reconnect();
      detectMock.mockClear();

      // Now refresh should work again
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(detectMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("when disconnect is called", () => {
    it("should reset auth failure state", async () => {
      setup();
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate();

      // Simulate auth failure
      detectMock.mockRejectedValue(createRequestError({ statusCode: 401 }));
      await vi.advanceTimersByTimeAsync(30_000);

      // Disconnect resets tracking
      clusterConnection.disconnect();

      // Re-activate
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await clusterConnection.activate(true);
      detectMock.mockClear();

      // Should refresh normally
      detectMock.mockResolvedValue({ value: "v1.28.0", accuracy: 100 });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(detectMock).toHaveBeenCalledTimes(1);
    });
  });
});
