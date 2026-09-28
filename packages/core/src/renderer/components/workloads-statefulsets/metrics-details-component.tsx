/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import statefulSetMetricsInjectable from "./metrics.injectable";

import type { StatefulSet } from "@freelensapp/kube-object";

import type { StatefulSetPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-stateful-sets.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<StatefulSetPodMetricData>;
}

const NonInjectedStatefulSetMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<StatefulSet> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
      <PodCharts />
    </TimeRangedResourceMetrics>
  ),
);

export const StatefulSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<StatefulSet>>(
  NonInjectedStatefulSetMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(statefulSetMetricsInjectable, {
        statefulSet: props.object,
      }),
      ...props,
    }),
  },
);
