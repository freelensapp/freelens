/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Pod } from "@freelensapp/kube-object";

interface PodMetricsInjectableParams {
  pod: Pod;
}

const podMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "pod-metrics",
  getObject: ({ pod }: PodMetricsInjectableParams) => pod,
  getObjectId: (pod) => pod.getId(),
  request: ({ di, object: pod, start, end, range }) =>
    di.inject(requestPodMetricsInjectable)([pod], pod.getNs(), undefined, "pod, namespace", {
      start,
      end,
      range,
      metrics: ["cpuUsage", "memoryUsage", "fsUsage", "fsWrites", "fsReads", "networkReceive", "networkTransmit"],
    }),
});

export default podMetricsInjectable;
