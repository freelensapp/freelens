/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { now } from "mobx-utils";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import { asyncComputed } from "../../../common/utils/async-computed";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

const everyMinute = 60 * 1000;

const clusterOverviewMetricsInjectable = getInjectable({
  id: "cluster-overview-metrics",
  instantiate: (di) => {
    const requestClusterMetricsByNodeNames = di.inject(requestClusterMetricsByNodeNamesInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed<Partial<ClusterMetricData> | undefined>({
      getValueFromObservedPromise: async () => {
        now(everyMinute);

        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        // Pass an empty node list to indicate "all nodes, no filter".
        // This avoids filtering cluster-wide metrics by currently-alive nodes,
        // which would miss historical data from nodes that have been replaced
        // on autoscaled clusters (see #2409).
        return requestClusterMetricsByNodeNames([], {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.singleton,
});

export default clusterOverviewMetricsInjectable;
