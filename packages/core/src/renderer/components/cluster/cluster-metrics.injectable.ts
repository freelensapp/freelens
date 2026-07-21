/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

const everyMinute = 60 * 1000;

const clusterOverviewMetricsInjectable = getInjectable({
  id: "cluster-overview-metrics",
  instantiate: (di) => {
    const requestClusterMetricsByNodeNames = di.inject(requestClusterMetricsByNodeNamesInjectable);
    const selectedNodeRoleForMetrics = di.inject(selectedNodeRoleForMetricsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);
    const logger = di.inject(loggerInjectionToken);

    return asyncComputed<Partial<ClusterMetricData> | undefined>({
      getValueFromObservedPromise: async () => {
        now(everyMinute);

        const nodeNames = selectedNodeRoleForMetrics.nodes.get().map((node) => node.getName());
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        try {
          return await requestClusterMetricsByNodeNames(nodeNames, {
            start,
            end,
            range,
          });
        } catch (error) {
          // asyncComputed's internal promise chain only attaches a `.then()`,
          // with no rejection handler, so letting this promise reject would
          // leave `pending` stuck at `true` forever (a permanent spinner).
          // Fall back to the same "no metrics" shape the route used to
          // resolve with before it started rejecting on failure.
          logger.debug("[CLUSTER-OVERVIEW-METRICS]: failed to load cluster metrics", { error });

          return {};
        }
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.singleton,
});

export default clusterOverviewMetricsInjectable;
