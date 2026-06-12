/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { ResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import statefulSetMetricsInjectable from "./metrics.injectable";

import type { StatefulSet } from "@freelensapp/kube-object";

import type { StatefulSetPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-stateful-sets.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<StatefulSetPodMetricData>;
}

const NonInjectedStatefulSetMetricsDetailsComponent = ({
  object,
  metrics,
}: KubeObjectDetailsProps<StatefulSet> & Dependencies) => (
  <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
    <PodCharts />
  </ResourceMetrics>
);

export const StatefulSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<StatefulSet>>(
  NonInjectedStatefulSetMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(statefulSetMetricsInjectable, props.object),
      ...props,
    }),
  },
);
