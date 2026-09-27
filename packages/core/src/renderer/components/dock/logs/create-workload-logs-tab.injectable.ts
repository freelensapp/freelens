/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createLogsTabInjectable from "./create-logs-tab.injectable";
import { findOptimalDefaultContainerOfPod } from "./default-container-helper";
import getWorkloadPodsInjectable from "./get-workload-pods.injectable";

import type { DaemonSet, Deployment, Job, ReplicaSet, StatefulSet } from "@freelensapp/kube-object";

import type { TabId } from "../dock/store";
import type { CreateLogsTabData } from "./create-logs-tab.injectable";
import type { GetWorkloadPods } from "./get-workload-pods.injectable";

export interface WorkloadLogsTabData {
  workload: StatefulSet | Job | Deployment | DaemonSet | ReplicaSet;
}

interface Dependencies {
  createLogsTab: (title: string, data: CreateLogsTabData) => TabId;
  getWorkloadPods: GetWorkloadPods;
}

/**
 * The pods of a Deployment are owned by its ReplicaSets, so they are found by
 * the labels of its selector. The template labels stand in for a selector
 * made of expressions only.
 */
function getPodSelector(workload: WorkloadLogsTabData["workload"]): string[] | undefined {
  if (workload.kind !== "Deployment") {
    return undefined;
  }

  const selectors = workload.getSelectors();

  return selectors.length ? selectors : workload.getTemplateLabels();
}

const createWorkloadLogsTab =
  ({ createLogsTab, getWorkloadPods }: Dependencies) =>
  ({ workload }: WorkloadLogsTabData): TabId | undefined => {
    const owner = {
      kind: workload.kind,
      name: workload.getName(),
      uid: workload.getId(),
    };
    const podSelector = getPodSelector(workload);

    // A selector without labels would match every pod of the namespace.
    if (podSelector && podSelector.length === 0) {
      return undefined;
    }

    const namespace = workload.getNs();
    const [firstPod] = getWorkloadPods({ owner, namespace, podSelector });

    if (!firstPod) {
      return undefined;
    }

    return createLogsTab(`${workload.kind} ${workload.getName()}`, {
      selectedContainer: findOptimalDefaultContainerOfPod(firstPod).name,
      selectedPodId: firstPod.getId(),
      namespace,
      owner,
      combined: true,
      podSelector,
    });
  };

const createWorkloadLogsTabInjectable = getInjectable({
  id: "create-workload-logs-tab",

  instantiate: (di) =>
    createWorkloadLogsTab({
      createLogsTab: di.inject(createLogsTabInjectable),
      getWorkloadPods: di.inject(getWorkloadPodsInjectable),
    }),
});

export default createWorkloadLogsTabInjectable;
