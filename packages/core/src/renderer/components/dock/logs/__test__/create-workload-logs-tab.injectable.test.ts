/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../../../getDiForUnitTesting";
import createWorkloadLogsTabInjectable from "../create-workload-logs-tab.injectable";
import getLogTabDataInjectable from "../get-log-tab-data.injectable";
import getRandomIdForPodLogsTabInjectable from "../get-random-id-for-pod-logs-tab.injectable";
import getWorkloadPodsInjectable from "../get-workload-pods.injectable";
import { deploymentPod1, deploymentPod2 } from "./pod.mock";

import type { Deployment, StatefulSet } from "@freelensapp/kube-object";

import type { DiContainer } from "@ogre-tools/injectable";

import type { GetWorkloadPods, WorkloadPodsQuery } from "../get-workload-pods.injectable";

interface FakeWorkload {
  kind: string;
  name: string;
  uid: string;
  selectors?: string[];
  templateLabels?: string[];
}

function fakeWorkload<Workload extends Deployment | StatefulSet>({
  kind,
  name,
  uid,
  selectors = [],
  templateLabels = [],
}: FakeWorkload): Workload {
  return {
    kind,
    getName: () => name,
    getId: () => uid,
    getNs: () => "default",
    getSelectors: () => selectors,
    getTemplateLabels: () => templateLabels,
  } as unknown as Workload;
}

describe("create workload logs tab", () => {
  let di: DiContainer;
  let getWorkloadPods: ReturnType<typeof vi.fn<GetWorkloadPods>>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(getRandomIdForPodLogsTabInjectable, () => () => "test-id");
    // The real one reads the pod store, which exists in a cluster frame only.
    getWorkloadPods = vi.fn<GetWorkloadPods>(() => []);
    di.override(getWorkloadPodsInjectable, () => getWorkloadPods);
  });

  it("returns undefined when the workload has no pods", () => {
    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const workload = fakeWorkload<StatefulSet>({ kind: "StatefulSet", name: "empty-set", uid: "uid-1" });

    expect(createWorkloadLogsTab({ workload })).toBeUndefined();
  });

  it("opens a combined tab that finds the pods of a Deployment by the labels of its selector", () => {
    getWorkloadPods.mockReturnValue([deploymentPod1, deploymentPod2]);

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload<Deployment>({
      kind: "Deployment",
      name: "super-deployment",
      uid: "uuid",
      selectors: ["app=super"],
      templateLabels: ["app=super", "tier=web"],
    });

    const tabId = createWorkloadLogsTab({ workload });
    const query: WorkloadPodsQuery = {
      owner: { kind: "Deployment", name: "super-deployment", uid: "uuid" },
      namespace: "default",
      podSelector: ["app=super"],
    };

    expect(tabId).toBeDefined();
    expect(getWorkloadPods).toHaveBeenCalledWith(query);
    expect(getLogTabData(tabId!)).toMatchObject({
      combined: true,
      podSelector: ["app=super"],
      selectedPodId: deploymentPod1.getId(),
      namespace: "default",
      owner: { kind: "Deployment", name: "super-deployment", uid: "uuid" },
    });
  });

  it("uses the template labels of a Deployment whose selector has no labels", () => {
    getWorkloadPods.mockReturnValue([deploymentPod1]);

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload<Deployment>({
      kind: "Deployment",
      name: "expressions-only",
      uid: "uuid",
      templateLabels: ["app=super"],
    });

    expect(getLogTabData(createWorkloadLogsTab({ workload })!)).toMatchObject({ podSelector: ["app=super"] });
  });

  it("does not open a tab for a Deployment without any label to find its pods by", () => {
    getWorkloadPods.mockReturnValue([deploymentPod1]);

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const workload = fakeWorkload<Deployment>({ kind: "Deployment", name: "no-labels", uid: "uuid" });

    expect(createWorkloadLogsTab({ workload })).toBeUndefined();
    expect(getWorkloadPods).not.toHaveBeenCalled();
  });

  it("finds the pods of the other workloads by their owner", () => {
    getWorkloadPods.mockReturnValue([deploymentPod1, deploymentPod2]);

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload<StatefulSet>({
      kind: "StatefulSet",
      name: "super-set",
      uid: "uuid",
      selectors: ["app=super"],
    });

    const tabId = createWorkloadLogsTab({ workload });

    expect(getLogTabData(tabId!)).toMatchObject({ combined: true, selectedPodId: deploymentPod1.getId() });
    expect(getLogTabData(tabId!)?.podSelector).toBeUndefined();
  });

  it("opens a combined tab for a workload with a single pod too, so that it follows the workload", () => {
    getWorkloadPods.mockReturnValue([deploymentPod1]);

    const createWorkloadLogsTab = di.inject(createWorkloadLogsTabInjectable);
    const getLogTabData = di.inject(getLogTabDataInjectable);
    const workload = fakeWorkload<StatefulSet>({ kind: "StatefulSet", name: "solo-set", uid: "uuid" });

    expect(getLogTabData(createWorkloadLogsTab({ workload })!)).toMatchObject({ combined: true });
  });
});
