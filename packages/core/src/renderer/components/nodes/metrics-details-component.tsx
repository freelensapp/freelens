/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import nodeMetricsInjectable from "./metrics.injectable";
import { NodeCharts } from "./node-charts";

import type { Node } from "@freelensapp/kube-object";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<ClusterMetricData>>;
}

const NonInjectedNodeMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Node> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={["CPU", "Memory", "Disk", "Pods"]} object={object} metrics={metrics}>
      <NodeCharts />
    </TimeRangedResourceMetrics>
  ),
);

export const NodeMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Node>>(
  NonInjectedNodeMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(nodeMetricsInjectable, {
        node: props.object,
      }),
      ...props,
    }),
  },
);
