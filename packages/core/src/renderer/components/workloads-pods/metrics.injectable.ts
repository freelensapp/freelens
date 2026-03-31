/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { Pod } from "@freelensapp/kube-object";

interface PodMetricsInjectableParams {
  pod: Pod;
  timeRangeKey: string;
}

const podMetricsInjectable = getInjectable({
  id: "pod-metrics",
  instantiate: (di, { pod }: PodMetricsInjectableParams) => {
    const requestPodMetrics = di.inject(requestPodMetricsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000);
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPodMetrics([pod], pod.getNs(), undefined, "pod, namespace", {
          start,
          end,
          range,
          metrics: ["cpuUsage", "memoryUsage", "fsUsage", "fsWrites", "fsReads", "networkReceive", "networkTransmit"],
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { pod, timeRangeKey }: PodMetricsInjectableParams) => `${pod.getId()}-${timeRangeKey}`,
  }),
});

export default podMetricsInjectable;
