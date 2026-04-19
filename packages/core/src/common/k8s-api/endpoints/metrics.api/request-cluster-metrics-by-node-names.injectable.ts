/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { MetricData } from "../metrics.api";
import type { RequestMetricsParams } from "./request-metrics.injectable";

export interface ClusterMetricData {
  memoryUsage: MetricData;
  memoryRequests: MetricData;
  memoryLimits: MetricData;
  memoryCapacity: MetricData;
  memoryAllocatableCapacity: MetricData;
  cpuUsage: MetricData;
  cpuRequests: MetricData;
  cpuLimits: MetricData;
  cpuCapacity: MetricData;
  cpuAllocatableCapacity: MetricData;
  podUsage: MetricData;
  podCapacity: MetricData;
  podAllocatableCapacity: MetricData;
  fsSize: MetricData;
  fsUsage: MetricData;
}

type ClusterMetricKey = keyof ClusterMetricData;

const defaultClusterMetricKeys: ClusterMetricKey[] = [
  "memoryUsage",
  "memoryRequests",
  "memoryLimits",
  "memoryCapacity",
  "memoryAllocatableCapacity",
  "cpuUsage",
  "cpuRequests",
  "cpuLimits",
  "cpuCapacity",
  "cpuAllocatableCapacity",
  "podUsage",
  "podCapacity",
  "podAllocatableCapacity",
];

export type RequestClusterMetricsByNodeNames = (
  nodeNames: string[],
  params?: RequestMetricsParams & { metrics?: ClusterMetricKey[] },
) => Promise<Partial<ClusterMetricData>>;

const requestClusterMetricsByNodeNamesInjectable = getInjectable({
  id: "get-cluster-metrics-by-node-names",
  instantiate: (di): RequestClusterMetricsByNodeNames => {
    const requestMetrics = di.inject(requestMetricsInjectable);

    return (nodeNames, params = {}) => {
      const opts = {
        category: "cluster",
        nodes: nodeNames.join("|"),
      };
      const { metrics = defaultClusterMetricKeys, ...requestParams } = params;
      const query = metrics.reduce(
        (acc, metricName) => {
          acc[metricName] = opts;

          return acc;
        },
        {} as Record<ClusterMetricKey, typeof opts>,
      );

      return requestMetrics(query, requestParams);
    };
  },
});

export default requestClusterMetricsByNodeNamesInjectable;
