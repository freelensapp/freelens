/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podMetricsApiInjectable } from "@freelensapp/kube-api-specifics";
import { Pod, PodMetrics } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";
import directoryForKubeConfigsInjectable from "../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";

import type { PodMetricsApi } from "@freelensapp/kube-api";

import type { MockProxy } from "vitest-mock-extended";

import type { PodStore } from "../workloads-pods/store";

const runningPod = new Pod({
  apiVersion: "foo",
  kind: "Pod",
  metadata: {
    name: "foobar",
    resourceVersion: "foobar",
    uid: "foobar",
    namespace: "default",
    selfLink: "/api/v1/pods/default/foobar",
  },
  status: {
    phase: "Running",
    conditions: [
      {
        type: "Initialized",
        status: "True",
        lastProbeTime: 1,
        lastTransitionTime: "1",
      },
      {
        type: "Ready",
        status: "True",
        lastProbeTime: 1,
        lastTransitionTime: "1",
      },
    ],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.1",
    startTime: "now",
    containerStatuses: [],
    initContainerStatuses: [],
  },
});

const pendingPod = new Pod({
  apiVersion: "foo",
  kind: "Pod",
  metadata: {
    name: "foobar-pending",
    resourceVersion: "foobar",
    uid: "foobar-pending",
    namespace: "default",
    selfLink: "/api/v1/pods/default/foobar-pending",
  },
});

const failedPod = new Pod({
  apiVersion: "foo",
  kind: "Pod",
  metadata: {
    name: "foobar-failed",
    resourceVersion: "foobar",
    uid: "foobar-failed",
    namespace: "default",
    selfLink: "/api/v1/pods/default/foobar-failed",
  },
  status: {
    phase: "Failed",
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.1",
    startTime: "now",
  },
});

const evictedPod = new Pod({
  apiVersion: "foo",
  kind: "Pod",
  metadata: {
    name: "foobar-evicted",
    resourceVersion: "foobar",
    uid: "foobar-evicted",
    namespace: "default",
    selfLink: "/api/v1/pods/default/foobar-evicted",
  },
  status: {
    phase: "Failed",
    reason: "Evicted",
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.1",
    startTime: "now",
  },
});

const succeededPod = new Pod({
  apiVersion: "foo",
  kind: "Pod",
  metadata: {
    name: "foobar-succeeded",
    resourceVersion: "foobar",
    uid: "foobar-succeeded",
    namespace: "default",
    selfLink: "/api/v1/pods/default/foobar-succeeded",
  },
  status: {
    phase: "Succeeded",
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.1",
    startTime: "now",
  },
});

const createPodMetrics = (namespace: string, name: string) =>
  new PodMetrics({
    apiVersion: "metrics.k8s.io/v1beta1",
    kind: "PodMetrics",
    metadata: {
      name,
      resourceVersion: "foobar",
      uid: `${namespace}/${name}`,
      namespace,
      selfLink: `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods/${name}`,
    },
    timestamp: "now",
    window: "30s",
    containers: [],
  });

describe("Pod Store tests", () => {
  let podStore: PodStore;
  let podMetricsApi: MockProxy<PodMetricsApi>;
  let contextNamespaces: string[];
  let isLoadingAll: boolean;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    podMetricsApi = mock<PodMetricsApi>();
    contextNamespaces = ["default"];
    isLoadingAll = false;

    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    di.override(directoryForKubeConfigsInjectable, () => "/some-kube-configs");
    di.override(storesAndApisCanBeCreatedInjectable, () => true);

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );
    di.override(podMetricsApiInjectable, () => podMetricsApi);
    di.override(clusterFrameContextForNamespacedResourcesInjectable, () => ({
      allNamespaces: ["default", "team-a", "team-b"],
      get contextNamespaces() {
        return contextNamespaces;
      },
      hasSelectedAll: false,
      isLoadingAll: () => isLoadingAll,
      isGlobalWatchEnabled: () => true,
    }));

    podStore = di.inject(podStoreInjectable);
  });

  it("gets Pod statuses in proper sorting order", () => {
    const statuses = Object.entries(
      podStore.getStatuses([pendingPod, runningPod, succeededPod, failedPod, evictedPod, evictedPod]),
    );

    expect(statuses).toEqual([
      ["Succeeded", 1],
      ["Running", 1],
      ["Pending", 1],
      ["Failed", 1],
      ["Evicted", 2],
    ]);
  });

  it("counts statuses properly", () => {
    const statuses = Object.entries(
      podStore.getStatuses([pendingPod, pendingPod, pendingPod, runningPod, failedPod, failedPod]),
    );

    expect(statuses).toEqual([
      ["Running", 1],
      ["Pending", 3],
      ["Failed", 2],
    ]);
  });

  describe("loadKubeMetrics", () => {
    beforeEach(() => {
      podMetricsApi.list.mockImplementation(async ({ namespace } = {}) => {
        if (!namespace || namespace === "team-b") {
          throw new Error("forbidden");
        }

        return [createPodMetrics(namespace, "foobar")];
      });
    });

    it("lists pod metrics per selected namespace", async () => {
      contextNamespaces = ["team-a"];

      await podStore.loadKubeMetrics();

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: "team-a" }]]);
      expect(podStore.kubeMetrics.map((metrics) => metrics.getId())).toEqual(["team-a/foobar"]);
    });

    it("lists pod metrics at the cluster scope when all namespaces are selected", async () => {
      podMetricsApi.list.mockResolvedValue([createPodMetrics("default", "foobar")]);
      contextNamespaces = ["default", "team-a", "team-b"];
      isLoadingAll = true;

      await podStore.loadKubeMetrics();

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: undefined }]]);
      expect(podStore.kubeMetrics.map((metrics) => metrics.getId())).toEqual(["default/foobar"]);
    });

    it("lists pod metrics of the given namespace only", async () => {
      isLoadingAll = true;

      await podStore.loadKubeMetrics("team-a");

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: "team-a" }]]);
    });

    it("keeps the pod metrics of the namespaces that could be listed", async () => {
      contextNamespaces = ["default", "team-b"];

      await podStore.loadKubeMetrics();

      expect(podStore.kubeMetrics.map((metrics) => metrics.getId())).toEqual(["default/foobar"]);
    });

    it("keeps the previous pod metrics when no namespace could be listed", async () => {
      await podStore.loadKubeMetrics();
      contextNamespaces = ["team-b"];

      await podStore.loadKubeMetrics();

      expect(podStore.kubeMetrics.map((metrics) => metrics.getId())).toEqual(["default/foobar"]);
    });
  });
});
