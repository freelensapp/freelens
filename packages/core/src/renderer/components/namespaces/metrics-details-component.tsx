/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import namespaceMetricsInjectable from "./metrics.injectable";

import type { Namespace } from "@freelensapp/kube-object";

import type { PodMetricInNamespaceData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<PodMetricInNamespaceData>;
}

const NonInjectedNamespaceMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Namespace> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
      <PodCharts />
    </TimeRangedResourceMetrics>
  ),
);

export const NamespaceMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Namespace>>(
  NonInjectedNamespaceMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(namespaceMetricsInjectable, {
        namespace: props.object,
      }),
      ...props,
    }),
  },
);
