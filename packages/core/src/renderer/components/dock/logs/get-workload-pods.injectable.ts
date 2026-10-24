/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import podStoreInjectable from "../../workloads-pods/store.injectable";

import type { Pod } from "@freelensapp/kube-object";

import type { LogTabOwnerRef } from "./tab-store";

export interface WorkloadPodsQuery {
  owner: LogTabOwnerRef;
  namespace: string;
  /**
   * The labels, as `key=value`, that select the pods of a workload that does
   * not own them directly.
   */
  podSelector?: string[];
}

export type GetWorkloadPods = (query: WorkloadPodsQuery) => Pod[];

/**
 * The pods a workload has now, in name order. It reads the pod store only, the
 * one store a logs tab keeps subscribed.
 */
const getWorkloadPodsInjectable = getInjectable({
  id: "get-workload-pods",

  instantiate: (di): GetWorkloadPods => {
    const podStore = di.inject(podStoreInjectable);

    return ({ owner, namespace, podSelector }) => {
      const pods = podSelector?.length
        ? podStore.getByLabel(podSelector).filter((pod) => pod.getNs() === namespace)
        : podStore.getPodsByOwnerId(owner.uid);

      return pods.sort((a, b) => a.getName().localeCompare(b.getName()));
    };
  },
});

export default getWorkloadPodsInjectable;
