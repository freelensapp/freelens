/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Pod } from "@freelensapp/kube-object";
import { observable } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import directoryForKubeConfigsInjectable from "../../../common/app-paths/directory-for-kube-configs/directory-for-kube-configs.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import storesAndApisCanBeCreatedInjectable from "../../stores-apis-can-be-created.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";

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

describe("Pod Store tests", () => {
  let podStore: PodStore;

  beforeEach(() => {
    const di = getDiForUnitTesting();

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
      }: { namespace?: string; nodeName?: string; ownerIds?: string[] },
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
        spec: nodeName ? ({ nodeName } as Pod["spec"]) : undefined,
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
});
