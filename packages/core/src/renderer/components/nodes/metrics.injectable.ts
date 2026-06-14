/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Node } from "@freelensapp/kube-object";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

type NodeMetricKey = keyof ClusterMetricData;

interface NodeMetricsInjectableParams {
  node: Node;
}

const nodeMetricKeys: NodeMetricKey[] = [
  "memoryUsage",
  "workloadMemoryUsage",
  "memoryRequests",
  "memoryCapacity",
  "memoryAllocatableCapacity",
  "cpuUsage",
  "cpuRequests",
  "cpuCapacity",
  "cpuAllocatableCapacity",
  "podUsage",
  "podCapacity",
  "fsSize",
  "fsUsage",
];

const nodeMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "node-metrics",
  getObject: ({ node }: NodeMetricsInjectableParams) => node,
  getObjectId: (node) => node.getId(),
  request: ({ di, object: node, start, end, range }) =>
    di.inject(requestClusterMetricsByNodeNamesInjectable)([node.getName()], {
      start,
      end,
      range,
      metrics: nodeMetricKeys,
    }),
});

export default nodeMetricsInjectable;
