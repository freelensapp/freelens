/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Container, Pod } from "@freelensapp/kube-object";

interface PodContainerParams {
  pod: Pod;
  container: Container;
  timeRangeKey: string;
}

const podContainerMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "pod-container-metrics",
  getObject: ({ pod, container }: PodContainerParams) => ({ pod, container }),
  getObjectId: ({ pod, container }) => `${pod.getId()}-${container.name}`,
  request: ({ di, object: { pod, container }, start, end, range }) =>
    di.inject(requestPodMetricsInjectable)([pod], pod.getNs(), container, "pod, container, namespace", {
      start,
      end,
      range,
      metrics: [
        "cpuUsage",
        "cpuRequests",
        "cpuLimits",
        "memoryUsage",
        "memoryRequests",
        "memoryLimits",
        "fsUsage",
        "fsWrites",
        "fsReads",
      ],
    }),
});

export default podContainerMetricsInjectable;
