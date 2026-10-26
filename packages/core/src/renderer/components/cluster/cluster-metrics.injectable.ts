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
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";

const everyMinute = 60 * 1000;

const clusterOverviewMetricsInjectable = getInjectable({
  id: "cluster-overview-metrics",
  instantiate: (di) => {
    const requestClusterMetricsByNodeNames = di.inject(requestClusterMetricsByNodeNamesInjectable);
    const selectedNodeRoleForMetrics = di.inject(selectedNodeRoleForMetricsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed<Partial<ClusterMetricData> | undefined>({
      getValueFromObservedPromise: async () => {
        now(everyMinute);

        // The node name filter is built from the nodes alive right now, while
        // the time range can reach days back: on clusters with node churn the
        // samples of the replaced nodes would be filtered out (see #2409).
        // When the cluster has nodes of a single role the selected role covers
        // every node, so the filter is skipped and the query aggregates the
        // whole cluster over the time range. When both roles are present the
        // filter is kept to honour the Master/Worker choice.
        const bothRolesPresent =
          selectedNodeRoleForMetrics.hasMasterNodes.get() && selectedNodeRoleForMetrics.hasWorkerNodes.get();
        const nodeNames = bothRolesPresent ? selectedNodeRoleForMetrics.nodes.get().map((node) => node.getName()) : [];
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestClusterMetricsByNodeNames(nodeNames, {
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
