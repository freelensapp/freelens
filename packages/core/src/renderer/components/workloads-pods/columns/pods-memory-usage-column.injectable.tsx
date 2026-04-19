/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { podListLayoutColumnInjectionToken } from "@freelensapp/list-layout";
import { bytesToUnits } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { observer } from "mobx-react";
import React from "react";
import podStoreInjectable from "../../workloads-pods/store.injectable";
import { COLUMN_PRIORITY } from "./column-priority";

import type { Pod } from "@freelensapp/kube-object";
import type { PodStore } from "../store";

interface PodMemoryCellProps {
  pod: Pod;
  podStore: PodStore;
}

function bytesToUnitsAligned(bytes: number): string {
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(1)}Ki`;
  }
  return bytesToUnits(bytes, { precision: 1 }).replace(/B$/, "");
}

const PodMemoryCell = observer(({ pod, podStore }: PodMemoryCellProps) => {
  const { memory } = podStore.getPodKubeMetrics(pod);

  return <span>{bytesToUnitsAligned(memory)}</span>;
});

const columnId = "memoryUsage";

export const podsUsedMemoryColumnInjectable = getInjectable({
  id: "pods-memory-usage-column",
  instantiate: (di) => {
    const podStore = di.inject(podStoreInjectable);

    return {
      id: columnId,
      kind: "Pod",
      apiVersion: "v1",
      priority: COLUMN_PRIORITY.MEMORY_USAGE,
      content: (pod: Pod) => <PodMemoryCell pod={pod} podStore={podStore} />,
      header: { title: "Memory", className: "memory", sortBy: columnId, id: columnId },
      sortingCallBack: (pod: Pod) => {
        const { memory } = podStore.getPodKubeMetrics(pod);

        return isNaN(memory) ? 0 : memory;
      },
    };
  },
  injectionToken: podListLayoutColumnInjectionToken,
});
