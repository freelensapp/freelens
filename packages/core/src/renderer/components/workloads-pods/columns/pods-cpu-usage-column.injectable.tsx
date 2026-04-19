/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import { observer } from "mobx-react";
import React from "react";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";
import type { PodStore } from "../store";

interface PodCpuCellProps {
  pod: Pod;
  podStore: PodStore;
}

const PodCpuCell = observer(({ pod, podStore }: PodCpuCellProps) => {
  const { cpu } = podStore.getPodKubeMetrics(pod);

  return <span>{isNaN(cpu) ? "N/A" : cpu.toFixed(3)}</span>;
});

const columnId = "cpuUsage";

export const podsUsedCpuColumnInjectable = getInjectable({
  id: "pods-cpu-usage-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.CPU_USAGE,
      content: (pod: Pod) => <PodCpuCell pod={pod} podStore={podStore} />,
      header: { title: "CPU", className: "cpu", sortBy: columnId, id: columnId },
      sortingCallBack: (pod: Pod) => {
        const { cpu } = podStore.getPodKubeMetrics(pod);

        return isNaN(cpu) ? 0 : cpu;
      },
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
