/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { Node } from "@freelensapp/kube-object";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

type NodeMetricKey = keyof ClusterMetricData;

interface NodeMetricsInjectableParams {
  node: Node;
  timeRangeKey: string;
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

const nodeMetricsInjectable = getInjectable({
  id: "node-metrics",
  instantiate: (di, { node }: NodeMetricsInjectableParams) => {
    const requestClusterMetricsByNodeNames = di.inject(requestClusterMetricsByNodeNamesInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000);
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestClusterMetricsByNodeNames([node.getName()], {
          start,
          end,
          range,
          metrics: nodeMetricKeys,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { node, timeRangeKey }: NodeMetricsInjectableParams) => `${node.getId()}-${timeRangeKey}`,
  }),
});

export default nodeMetricsInjectable;
