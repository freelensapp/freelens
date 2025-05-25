/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "cpuUsage";

export const podsUsedCpuColumnInjectable = getInjectable({
  id: "pods-cpu-usage-column",
  instantiate: (di) => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.CPU_USAGE,
    content: (pod) => {
      const podStore = di.inject(podStoreInjectable);
      const metrics = podStore.getPodKubeMetrics(pod);
      const cpuUsage = metrics.cpu
      
      return <span>{cpuUsage === 0 ? "N/A" : cpuUsage.toFixed(3)}</span>;
    },
    header: { title: "CPU", className: "cpu", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => {
      const podStore = di.inject(podStoreInjectable);
      const metrics = podStore.getPodKubeMetrics(pod);
      
      return metrics.cpu;
    },
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
