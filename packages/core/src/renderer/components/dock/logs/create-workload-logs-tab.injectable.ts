/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import getPodsByOwnerIdInjectable from "../../workloads-pods/get-pods-by-owner-id.injectable";
import createLogsTabInjectable from "./create-logs-tab.injectable";
import { findOptimalDefaultContainerOfPod } from "./default-container-helper";

import type { KubeObject, Pod } from "@freelensapp/kube-object";

import type { GetPodsByOwnerId } from "../../workloads-pods/get-pods-by-owner-id.injectable";
import type { TabId } from "../dock/store";
import type { CreateLogsTabData } from "./create-logs-tab.injectable";

export interface WorkloadLogsTabData {
  workload: KubeObject;
  /**
   * The pods to show combined logs for. When omitted, falls back to looking
   * up pods whose `ownerReferences` point directly at `workload` -- which
   * only finds anything for workload kinds that own pods directly (e.g.
   * ReplicaSet, DaemonSet, StatefulSet, Job). A Deployment's pods are owned
   * by its ReplicaSet(s), not the Deployment itself, so callers opening
   * combined logs for a Deployment (or any other multi-hop owner) must pass
   * the already-resolved `pods` explicitly.
   */
  pods?: Pod[];
}

interface Dependencies {
  createLogsTab: (title: string, data: CreateLogsTabData) => TabId;
  getPodsByOwnerId: GetPodsByOwnerId;
}

const createWorkloadLogsTab =
  ({ createLogsTab, getPodsByOwnerId }: Dependencies) =>
  ({ workload, pods }: WorkloadLogsTabData): TabId | undefined => {
    const resolvedPods = pods ?? getPodsByOwnerId(workload.getId());

    if (resolvedPods.length === 0) {
      return undefined;
    }

    const [selectedPod, ...restOfPods] = resolvedPods;

    return createLogsTab(`${workload.kind} ${workload.getName()}`, {
      selectedContainer: findOptimalDefaultContainerOfPod(selectedPod).name,
      selectedPodId: selectedPod.getId(),
      mergedPodIds: restOfPods.length ? restOfPods.map((pod) => pod.getId()) : undefined,
      namespace: selectedPod.getNs(),
      owner: {
        kind: workload.kind,
        name: workload.getName(),
        uid: workload.getId(),
      },
    });
  };

const createWorkloadLogsTabInjectable = getInjectable({
  id: "create-workload-logs-tab",

  instantiate: (di) =>
    createWorkloadLogsTab({
      createLogsTab: di.inject(createLogsTabInjectable),
      getPodsByOwnerId: di.inject(getPodsByOwnerIdInjectable),
    }),
});

export default createWorkloadLogsTabInjectable;
