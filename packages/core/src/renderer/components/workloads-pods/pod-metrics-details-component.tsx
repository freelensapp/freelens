/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import podMetricsInjectable from "./metrics.injectable";
import { PodCharts, podMetricTabs } from "./pod-charts";

import type { Pod } from "@freelensapp/kube-object";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<PodMetricData>>;
}

const NonInjectedPodMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Pod> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
      <PodCharts />
    </TimeRangedResourceMetrics>
  ),
);

const PodMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Pod>>(
  NonInjectedPodMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(podMetricsInjectable, {
        pod: props.object,
      }),
      ...props,
    }),
  },
);

export default PodMetricsDetailsComponent;
