/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podMetricsApiInjectable } from "@freelensapp/kube-api-specifics";
import { PersistentVolumeClaim, Pod, PodMetrics } from "@freelensapp/kube-object";
import { observable } from "mobx";
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

  describe("lookups", () => {
    const createPod = (
      name: string,
      {
        namespace = "default",
        nodeName,
        ownerIds = [],
        claimNames = [],
      }: { namespace?: string; nodeName?: string; ownerIds?: string[]; claimNames?: string[] },
    ) =>
      new Pod({
        apiVersion: "v1",
        kind: "Pod",
        metadata: {
          name,
          resourceVersion: "1",
          uid: `${namespace}-${name}`,
          namespace,
          selfLink: `/api/v1/namespaces/${namespace}/pods/${name}`,
          ownerReferences: ownerIds.map((uid) => ({
            apiVersion: "apps/v1",
            kind: "ReplicaSet",
            name: uid,
            uid,
          })),
        },
        spec:
          nodeName || claimNames.length
            ? ({
                nodeName,
                volumes: claimNames.map((claimName, index) => ({
                  name: `volume-${index}`,
                  persistentVolumeClaim: { claimName },
                })),
              } as Pod["spec"])
            : undefined,
      });

    const a1 = createPod("a1", { nodeName: "node-1", ownerIds: ["owner-a"] });
    const b1 = createPod("b1", { namespace: "other", nodeName: "node-2", ownerIds: ["owner-b"] });
    const a2 = createPod("a2", { nodeName: "node-2", ownerIds: ["owner-a"] });
    const unscheduled = createPod("unscheduled", { ownerIds: ["owner-a", "owner-a"] });

    beforeEach(() => {
      podStore.items = observable.array([a1, b1, a2, unscheduled]);
      podStore.isLoaded = true;
    });

    it("returns the pods of an owner in store order, each once", () => {
      expect(podStore.getPodsByOwnerId("owner-a")).toEqual([a1, a2, unscheduled]);
      expect(podStore.getPodsByOwnerId("owner-b")).toEqual([b1]);
      expect(podStore.getPodsByOwnerId("owner-none")).toEqual([]);
    });

    it("returns the pods of a workload by its id", () => {
      const workload = createPod("workload", {});

      podStore.items.push(createPod("owned", { ownerIds: [workload.getId()] }));

      expect(podStore.getPodsByOwner(workload).map((pod) => pod.getName())).toEqual(["owned"]);
    });

    it("returns the pods of a node in store order", () => {
      expect(podStore.getPodsByNode("node-2")).toEqual([b1, a2]);
      expect(podStore.getPodsByNode("node-none")).toEqual([]);
    });

    it("returns no pods of a node until the store is loaded", () => {
      podStore.isLoaded = false;

      expect(podStore.getPodsByNode("node-1")).toEqual([]);
    });

    it("returns the pods of a namespace in store order", () => {
      expect(podStore.getPodsByNamespace("default")).toEqual([a1, a2, unscheduled]);
      expect(podStore.getPodsByNamespace("other")).toEqual([b1]);
      expect(podStore.getPodsByNamespace("none")).toEqual([]);
    });

    it("returns copies that a caller may change without changing the store", () => {
      podStore.getPodsByOwnerId("owner-a").reverse().pop();
      podStore.getPodsByNode("node-2").splice(0);
      podStore.getPodsByNamespace("default").length = 0;

      expect(podStore.getPodsByOwnerId("owner-a")).toEqual([a1, a2, unscheduled]);
      expect(podStore.getPodsByNode("node-2")).toEqual([b1, a2]);
      expect(podStore.getPodsByNamespace("default")).toEqual([a1, a2, unscheduled]);
    });

    it("returns the pods that mount a persistent volume claim, as the claim's getPods does", () => {
      const createClaim = (name: string, namespace: string) =>
        new PersistentVolumeClaim({
          apiVersion: "v1",
          kind: "PersistentVolumeClaim",
          metadata: {
            name,
            resourceVersion: "1",
            uid: `${namespace}-claim-${name}`,
            namespace,
            selfLink: `/api/v1/namespaces/${namespace}/persistentvolumeclaims/${name}`,
          },
        });
      const twice = createPod("twice", { claimNames: ["data", "data"] });
      const otherNamespace = createPod("other-namespace", { namespace: "other", claimNames: ["data"] });
      const both = createPod("both", { nodeName: "node-1", claimNames: ["logs", "data"] });
      const data = createClaim("data", "default");
      const logs = createClaim("logs", "default");
      const missing = createClaim("missing", "default");

      podStore.items.push(twice, otherNamespace, both);

      expect(podStore.getPodsByPersistentVolumeClaim(data)).toEqual([twice, both]);
      expect(podStore.getPodsByPersistentVolumeClaim(logs)).toEqual([both]);
      expect(podStore.getPodsByPersistentVolumeClaim(createClaim("data", "other"))).toEqual([otherNamespace]);
      expect(podStore.getPodsByPersistentVolumeClaim(missing)).toEqual([]);

      for (const claim of [data, logs, missing]) {
        expect(podStore.getPodsByPersistentVolumeClaim(claim)).toEqual(claim.getPods(podStore.items));
      }
    });

    it("follows added, changed and removed pods", () => {
      const a3 = createPod("a3", { nodeName: "node-1", ownerIds: ["owner-a"] });
      const movedA1 = createPod("a1", { namespace: "default", nodeName: "node-2", ownerIds: ["owner-c"] });

      podStore.items.push(a3);
      podStore.items[0] = movedA1;
      podStore.items.remove(b1);

      expect(podStore.getPodsByOwnerId("owner-a")).toEqual([a2, unscheduled, a3]);
      expect(podStore.getPodsByOwnerId("owner-b")).toEqual([]);
      expect(podStore.getPodsByOwnerId("owner-c")).toEqual([movedA1]);
      expect(podStore.getPodsByNode("node-1")).toEqual([a3]);
      expect(podStore.getPodsByNode("node-2")).toEqual([movedA1, a2]);
      expect(podStore.getPodsByNamespace("other")).toEqual([]);
    });
  });

  describe("loadKubeMetrics", () => {
    const forbidden = { kind: "Status", apiVersion: "v1", status: "Failure", reason: "Forbidden", code: 403 };
    let clusterError: unknown;

    beforeEach(() => {
      clusterError = undefined;
      podMetricsApi.list.mockImplementation(async ({ namespace } = {}) => {
        if (!namespace) {
          if (clusterError) {
            throw clusterError;
          }

          return [createPodMetrics("default", "foobar"), createPodMetrics("team-a", "foobar")];
        }

        if (namespace === "team-b") {
          throw forbidden;
        }

        return [createPodMetrics(namespace, "foobar")];
      });
    });

    const loadedIds = () => podStore.kubeMetrics.map((metrics) => metrics.getId());

    it("lists the pod metrics of the cluster in one request when it may, whatever namespaces are selected", async () => {
      contextNamespaces = ["default", "team-a"];

      await podStore.loadKubeMetrics();

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: undefined }]]);
      expect(loadedIds()).toEqual(["default/foobar", "team-a/foobar"]);
      expect(podStore.kubeMetricsRefreshSeconds).toBe(10);
    });

    describe("given the pod metrics of the cluster are forbidden", () => {
      beforeEach(() => {
        clusterError = forbidden;
      });

      it("lists them per selected namespace", async () => {
        contextNamespaces = ["team-a"];

        await podStore.loadKubeMetrics();

        expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: undefined }], [{ namespace: "team-a" }]]);
        expect(loadedIds()).toEqual(["team-a/foobar"]);
      });

      it("does not ask for the cluster again", async () => {
        contextNamespaces = ["team-a"];

        await podStore.loadKubeMetrics();
        podMetricsApi.list.mockClear();
        await podStore.loadKubeMetrics();

        expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: "team-a" }]]);
      });

      it("keeps the pod metrics of the namespaces that could be listed", async () => {
        contextNamespaces = ["default", "team-b"];

        await podStore.loadKubeMetrics();

        expect(loadedIds()).toEqual(["default/foobar"]);
      });

      it("keeps the previous pod metrics when no namespace could be listed", async () => {
        await podStore.loadKubeMetrics();
        contextNamespaces = ["team-b"];

        await podStore.loadKubeMetrics();

        expect(loadedIds()).toEqual(["default/foobar"]);
      });

      it("refreshes them at most one request a second", async () => {
        contextNamespaces = Array.from({ length: 25 }, (_, i) => `team-${i}`);

        expect(podStore.kubeMetricsRefreshSeconds).toBe(10);

        await podStore.loadKubeMetrics();

        expect(podStore.kubeMetricsRefreshSeconds).toBe(25);
      });

      it("keeps one request for the cluster when all namespaces are selected", async () => {
        contextNamespaces = ["default", "team-a", "team-b"];
        isLoadingAll = true;

        await podStore.loadKubeMetrics();

        expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: undefined }]]);
        expect(podStore.kubeMetricsRefreshSeconds).toBe(10);
      });
    });

    it("does not list per namespace when the cluster fails for another reason", async () => {
      clusterError = new Error("some-error");
      contextNamespaces = ["team-a"];

      await podStore.loadKubeMetrics();

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: undefined }]]);
      expect(podStore.kubeMetricsRefreshSeconds).toBe(10);
    });

    it("lists the pod metrics of the given namespace only", async () => {
      clusterError = forbidden;

      await podStore.loadKubeMetrics("team-a");

      expect(podMetricsApi.list.mock.calls).toEqual([[{ namespace: "team-a" }]]);
      expect(loadedIds()).toEqual(["team-a/foobar"]);
    });
  });
});
