/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { MetricData } from "../metrics.api";
import type { RequestMetricsParams } from "./request-metrics.injectable";

export interface PodMetricInNamespaceData {
  cpuUsage: MetricData;
  memoryUsage: MetricData;
  fsUsage: MetricData;
  fsWrites: MetricData;
  fsReads: MetricData;
  networkReceive: MetricData;
  networkTransmit: MetricData;
}

export type RequestPodMetricsInNamespace = (
  namespace: string,
  selector?: string,
  params?: RequestMetricsParams,
) => Promise<PodMetricInNamespaceData>;

const requestPodMetricsInNamespaceInjectable = getInjectable({
  id: "request-pod-metrics-in-namespace",
  instantiate: (di): RequestPodMetricsInNamespace => {
    const requestMetrics = di.inject(requestMetricsInjectable);

    return (namespace, selector, params) => {
      const opts = { category: "pods", pods: ".*", namespace, selector };

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

export default requestPodMetricsInNamespaceInjectable;
