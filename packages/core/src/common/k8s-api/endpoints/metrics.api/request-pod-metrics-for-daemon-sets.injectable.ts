/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { DaemonSet } from "@freelensapp/kube-object";

import type { MetricData } from "../metrics.api";
import type { RequestMetricsParams } from "./request-metrics.injectable";

export interface DaemonSetPodMetricData {
  cpuUsage: MetricData;
  memoryUsage: MetricData;
  fsUsage: MetricData;
  fsWrites: MetricData;
  fsReads: MetricData;
  networkReceive: MetricData;
  networkTransmit: MetricData;
}

export type RequestPodMetricsForDaemonSets = (
  daemonsets: DaemonSet[],
  namespace: string,
  selector?: string,
  params?: RequestMetricsParams,
) => Promise<DaemonSetPodMetricData>;

const requestPodMetricsForDaemonSetsInjectable = getInjectable({
  id: "request-pod-metrics-for-daemon-sets",
  instantiate: (di): RequestPodMetricsForDaemonSets => {
    const requestMetrics = di.inject(requestMetricsInjectable);

    return (daemonSets, namespace, selector = "", params) => {
      const podSelector = daemonSets.map((daemonSet) => `${daemonSet.getName()}-[[:alnum:]]{5}`).join("|");
      const opts = { category: "pods", pods: podSelector, namespace, selector };

      return requestMetrics(
        {
          cpuUsage: opts,
          memoryUsage: opts,
          fsUsage: opts,
          fsWrites: opts,
          fsReads: opts,
          networkReceive: opts,
          networkTransmit: opts,
        },
        {
          namespace,
          ...params,
        },
      );
    };
  },
});

export default requestPodMetricsForDaemonSetsInjectable;
