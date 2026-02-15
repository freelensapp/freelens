/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { MetricData } from "../metrics.api";

export interface PodMetricData {
  cpuUsage: MetricData;
  memoryUsage: MetricData;
  fsUsage: MetricData;
  fsWrites: MetricData;
  fsReads: MetricData;
  networkReceive: MetricData;
  networkTransmit: MetricData;
  cpuRequests: MetricData;
  cpuLimits: MetricData;
  memoryRequests: MetricData;
  memoryLimits: MetricData;
}

export type RequestPodMetrics = (
  pods: Pod[],
  namespace: string,
  container?: Container,
  selector?: string,
  opts?: { start?: number; end?: number; range?: number },
) => Promise<PodMetricData>;

const requestPodMetricsInjectable = getInjectable({
  id: "request-pod-metrics",
  instantiate: (di): RequestPodMetrics => {
    const requestMetrics = di.inject(requestMetricsInjectable);

    return (pods, namespace, container, selector = "pod, namespace", timeOpts = {}) => {
      const podSelector = pods.map((pod) => pod.getName()).join("|");
      const opts = { category: "pods", pods: podSelector, container: container?.name, namespace, selector };

      return requestMetrics(
        {
          cpuUsage: opts,
          cpuRequests: opts,
          cpuLimits: opts,
          memoryUsage: opts,
          memoryRequests: opts,
          memoryLimits: opts,
          fsUsage: opts,
          fsWrites: opts,
          fsReads: opts,
          networkReceive: opts,
          networkTransmit: opts,
        },
        {
          namespace,
          ...timeOpts,
        },
      );
    };
  },
});

export default requestPodMetricsInjectable;
