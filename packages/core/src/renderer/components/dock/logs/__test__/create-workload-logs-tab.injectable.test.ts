/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import getPodsByOwnerIdInjectable from "../../../workloads-pods/get-pods-by-owner-id.injectable";
import createWorkloadLogsTabInjectable from "../create-workload-logs-tab.injectable";
import getLogTabDataInjectable from "../get-log-tab-data.injectable";
import getRandomIdForPodLogsTabInjectable from "../get-random-id-for-pod-logs-tab.injectable";
import { deploymentPod1, deploymentPod2, deploymentPod3 } from "./pod.mock";

import type { KubeObject } from "@freelensapp/kube-object";

import type { DiContainer } from "@ogre-tools/injectable";

function fakeWorkload(kind: string, name: string, uid: string): KubeObject {
  return {
    kind,
    getName: () => name,
    getId: () => uid,
  } as unknown as KubeObject;
}

describe("create workload logs tab", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(getRandomIdForPodLogsTabInjectable, () => () => "test-id");
    // getPodsByOwnerIdInjectable pulls in podStoreInjectable, which asserts it
    // is only created in a cluster-frame environment. It is only actually
    // called by the fallback (no explicit `pods`) path, but injectable()
    // resolves the whole dependency graph eagerly, so every test needs a
    // usable stand-in even when it never exercises that path.
    di.override(getPodsByOwnerIdInjectable, () => () => []);
  });

  it("returns undefined when the workload has no pods", () => {
    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const workload = fakeWorkload("StatefulSet", "empty-set", "uid-1");

    expect(createWorkloadLogsTab({ workload })).toBeUndefined();
  });

  it("combines every pod passed in explicitly, regardless of how deep the ownership chain is", () => {
    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    // Deployment pods are owned by an intermediate ReplicaSet, not the
    // Deployment itself, so this only works with explicitly-passed pods.
    const workload = fakeWorkload("Deployment", "super-deployment", "uuid");

    const tabId = createWorkloadLogsTab({
      workload,
      pods: [deploymentPod1, deploymentPod2, deploymentPod3],
    });

    expect(tabId).toBeDefined();
    expect(getLogTabData(tabId!)).toMatchObject({
      selectedPodId: deploymentPod1.getId(),
      mergedPodIds: [deploymentPod2.getId(), deploymentPod3.getId()],
      owner: { kind: "Deployment", name: "super-deployment", uid: "uuid" },
    });
  });

  it("falls back to direct ownerReferences lookup when no pods are passed explicitly", () => {
    di.override(getPodsByOwnerIdInjectable, () => (id) => (id === "uuid" ? [deploymentPod1, deploymentPod2] : []));

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload("ReplicaSet", "super-replicaset", "uuid");

    const tabId = createWorkloadLogsTab({ workload });

    expect(tabId).toBeDefined();
    expect(getLogTabData(tabId!)).toMatchObject({
      selectedPodId: deploymentPod1.getId(),
      mergedPodIds: [deploymentPod2.getId()],
    });
  });

  it("does not set mergedPodIds for a single-pod workload", () => {
    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload("Deployment", "solo-deployment", "uuid");

    const tabId = createWorkloadLogsTab({ workload, pods: [deploymentPod1] });

    expect(getLogTabData(tabId!)).toMatchObject({
      selectedPodId: deploymentPod1.getId(),
      mergedPodIds: undefined,
    });
  });
});
