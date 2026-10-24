/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import freelensK8sProxyManagerInjectable from "./freelens-k8s-proxy-manager.injectable";
import prometheusHandlerInjectable from "./prometheus-handler/prometheus-handler.injectable";
import requestApiResourcesInjectable from "./request-api-resources.injectable";

import type { Logger } from "@freelensapp/logger";

import type { Mock } from "vitest";

import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";
import type { ClusterConnection } from "./cluster-connection.injectable";
import type { FreelensK8sProxyManager } from "./freelens-k8s-proxy-manager.injectable";

describe("ClusterConnection activation", () => {
  let clusterConnection: ClusterConnection;
  let restartMock: Mock<() => Promise<void>>;
  let events: string[];
  let pendingRestarts: { resolve: () => void; reject: (error: Error) => void }[];

  const countOf = (event: string) => events.filter((each) => each === event).length;

  // Each restart of the proxy waits until the test settles it, like the real
  // one waits for freelens-k8s-proxy to report that it serves.
  const settleRestart = async (index: number, error?: Error) => {
    if (error) {
      pendingRestarts[index].reject(error);
    } else {
      pendingRestarts[index].resolve();
    }

    await vi.advanceTimersByTimeAsync(0);
  };

  // Settles every restart, so that an activation started twice fails its
  // expectations instead of waiting for its second restart forever.
  const settleAllRestarts = async () => {
    for (const { resolve } of pendingRestarts) {
      resolve();
    }

    await vi.advanceTimersByTimeAsync(0);
  };

  beforeEach(() => {
    vi.useFakeTimers();

    const di = getDiForUnitTesting();
    const writeJsonSync = di.inject(writeJsonSyncInjectable);

    events = [];
    pendingRestarts = [];

    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "some-directory-for-temp");
    di.override(kubectlBinaryNameInjectable, () => "kubectl");
    di.override(kubectlDownloadingNormalizedArchInjectable, () => "amd64");
    di.override(normalizedPlatformInjectable, () => "darwin");

    const record = (message: string) => {
      events.push(message);
    };

    di.override(
      loggerInjectionToken,
      () =>
        ({
          debug: vi.fn(),
          info: vi.fn(record),
          warn: vi.fn(),
          error: vi.fn(),
          silly: vi.fn(),
        }) as Partial<Logger> as Logger,
    );
    di.override(broadcastConnectionUpdateInjectable, () => (update) => {
      record(update.message);
    });

    di.override(createCanIInjectable, () => () => () => Promise.resolve(true));
    di.override(createRequestNamespaceListPermissionsInjectable, () => () => async () => () => true);
    di.override(createListNamespacesInjectable, () => () => () => Promise.resolve(["default"]));
    di.override(requestApiResourcesInjectable, () => async () => ({
      callWasSuccessful: true,
      response: [{ apiName: "pods", kind: "Pod", group: "", version: "v1", namespaced: true }],
    }));
    di.override(prometheusHandlerInjectable, () => ({
      getPrometheusDetails: vi.fn(),
      setupPrometheus: vi.fn(),
    }));

    restartMock = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          record("restart");
          pendingRestarts.push({ resolve, reject });
        }),
    );

    const proxyManagerMock: FreelensK8sProxyManager = {
      getApiTarget: vi.fn().mockResolvedValue({}),
      ensureFreelensK8sProxyUrl: vi.fn().mockResolvedValue("https://127.0.0.1:9999/test"),
      restart: restartMock,
      ensureRunning: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    di.override(freelensK8sProxyManagerInjectable, () => proxyManagerMock);
    di.override(clusterVersionDetectorInjectable, () => ({
      key: ClusterMetadataKey.VERSION,
      detect: vi.fn().mockResolvedValue({ value: "v1.28.0", accuracy: 100 }),
    }));
    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

    const kubeconfig = {
      apiVersion: "v1",
      clusters: [{ name: "test-cluster", cluster: { server: "https://192.168.1.1:6443" } }],
      "current-context": "test-cluster",
      contexts: [{ context: { cluster: "test-cluster", user: "test-user" }, name: "test-cluster" }],
      users: [{ name: "test-user", user: {} }],
      kind: "Config",
      preferences: {},
    };

    writeJsonSync("/test-kubeconfig.yml", kubeconfig);
    // An activation is complete only once it has refreshed the accessibility
    // through the proxy kubeconfig.
    writeJsonSync("/some-proxy-kubeconfig-file", kubeconfig);

    vi.spyOn(Kubectl.prototype, "ensureKubectl").mockReturnValue(Promise.resolve(true));

    const cluster = di.inject(addClusterInjectable)({
      id: "test-cluster-id",
      contextName: "test-cluster",
      kubeConfigPath: "/test-kubeconfig.yml",
    });

    clusterConnection = di.inject(clusterConnectionInjectable, cluster);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when two non-forced activations overlap", () => {
    let first: Promise<void>;
    let second: Promise<void>;

    beforeEach(async () => {
      first = clusterConnection.activate();
      second = clusterConnection.activate();
      await vi.advanceTimersByTimeAsync(0);
    });

    it("returns the activation in flight to the second call", () => {
      expect(second).toBe(first);
    });

    it("restarts the proxy once and activates once", async () => {
      await settleAllRestarts();
      await Promise.all([first, second]);

      expect(restartMock).toHaveBeenCalledTimes(1);
      expect(countOf("[CLUSTER]: activate")).toBe(1);
    });

    it("does not report a failed start", async () => {
      await settleAllRestarts();
      await Promise.all([first, second]);

      expect(events.some((event) => event.startsWith("Failed to start connection"))).toBe(false);
    });
  });

  describe("when a forced activation arrives while one is in flight", () => {
    let first: Promise<void>;
    let forced: Promise<void>;

    beforeEach(async () => {
      first = clusterConnection.activate();
      await vi.advanceTimersByTimeAsync(0);
      forced = clusterConnection.activate(true);
      await vi.advanceTimersByTimeAsync(0);
    });

    it("does not start before the one in flight has settled", () => {
      expect(countOf("[CLUSTER]: activate")).toBe(1);
      expect(restartMock).toHaveBeenCalledTimes(1);
    });

    it("runs once, after the one in flight has settled", async () => {
      await settleAllRestarts();
      await Promise.all([first, forced]);

      const firstDone = events.indexOf("Connected, waiting for view to load ...");

      expect(countOf("[CLUSTER]: activate")).toBe(2);
      expect(events.lastIndexOf("[CLUSTER]: activate")).toBeGreaterThan(firstDone);
      expect(firstDone).toBeGreaterThan(-1);
      expect(restartMock).toHaveBeenCalledTimes(1);
    });

    it("runs once, after the one in flight has failed", async () => {
      await settleRestart(0, new Error("freelens-k8s-proxy was stopped before it was ready"));
      await vi.advanceTimersByTimeAsync(0);

      expect(countOf("[CLUSTER]: activate")).toBe(2);
      expect(restartMock).toHaveBeenCalledTimes(2);

      await settleRestart(1);
      await Promise.all([first, forced]);

      expect(countOf("[CLUSTER]: activate")).toBe(2);
      expect(countOf("Connected, waiting for view to load ...")).toBe(1);
    });
  });

  describe("when an activation has succeeded", () => {
    beforeEach(async () => {
      const activation = clusterConnection.activate();

      await vi.advanceTimersByTimeAsync(0);
      await settleRestart(0);
      await activation;
      events = [];
    });

    it("does not activate again on a later non-forced call", async () => {
      await clusterConnection.activate();

      expect(countOf("[CLUSTER]: activate")).toBe(0);
    });

    it("activates again on a later forced call", async () => {
      await clusterConnection.activate(true);

      expect(countOf("[CLUSTER]: activate")).toBe(1);
    });
  });

  describe("when an activation has failed", () => {
    beforeEach(async () => {
      const activation = clusterConnection.activate();

      await vi.advanceTimersByTimeAsync(0);
      await settleRestart(0, new Error("some-error"));
      await activation;
    });

    it("reports the failure", () => {
      expect(events).toContain("Failed to start connection: Error: some-error");
    });

    it("activates again on a later non-forced call", async () => {
      const activation = clusterConnection.activate();

      await vi.advanceTimersByTimeAsync(0);
      await settleRestart(1);
      await activation;

      expect(countOf("[CLUSTER]: activate")).toBe(2);
      expect(restartMock).toHaveBeenCalledTimes(2);
    });
  });
});
