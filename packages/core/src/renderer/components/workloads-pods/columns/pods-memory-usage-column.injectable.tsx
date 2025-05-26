/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { bytesToUnits } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

const columnId = "memoryUsage";

function bytesToUnitsAligned(bytes: number): string {
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(1)}Ki`;
  }
  return bytesToUnits(bytes, { precision: 1 }).replace(/B$/, "");
}

export const podsUsedMemoryColumnInjectable = getInjectable({
  id: "pods-memory-usage-column",
  instantiate: (di) => ({
    id: columnId,
    kind: "Pod",
    apiVersion: "v1",
    priority: COLUMN_PRIORITY.MEMORY_USAGE,
    content: (pod) => {
      const podStore = di.inject(podStoreInjectable);
      const metrics = podStore.getPodKubeMetrics(pod);

      return <span>{bytesToUnitsAligned(metrics.memory)}</span>;
    },
    header: { title: "Memory", className: "memory", sortBy: columnId, id: columnId },
    sortingCallBack: (pod) => {
      const podStore = di.inject(podStoreInjectable);
      const metrics = podStore.getPodKubeMetrics(pod);

      return isNaN(metrics.memory) ? 0 : metrics.memory;
    },
  }),
  injectionToken: podListLayoutColumnInjectionToken,
});
