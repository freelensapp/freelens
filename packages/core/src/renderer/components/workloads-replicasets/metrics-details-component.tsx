/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ReplicaSet } from "@freelensapp/kube-object";
import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import type { ReplicaSetPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-replica-sets.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { ResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import replicaSetMetricsInjectable from "./metrics.injectable";

interface Dependencies {
  metrics: IAsyncComputed<ReplicaSetPodMetricData>;
}

const NonInjectedReplicaSetMetricsDetailsComponent = ({
  object,
  metrics,
}: KubeObjectDetailsProps<ReplicaSet> & Dependencies) => (
  <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
    <PodCharts />
  </ResourceMetrics>
);

export const ReplicaSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<ReplicaSet>>(
  NonInjectedReplicaSetMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(replicaSetMetricsInjectable, props.object),
      ...props,
    }),
  },
);
