/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import jobMetricsInjectable from "./metrics.injectable";

import type { Job } from "@freelensapp/kube-object";

import type { JobPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-jobs.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<JobPodMetricData>;
}

const NonInjectedJobMetricsDetailsComponent = observer(
  ({ object, metrics }: KubeObjectDetailsProps<Job> & Dependencies) => (
    <TimeRangedResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
      <PodCharts />
    </TimeRangedResourceMetrics>
  ),
);

export const JobMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Job>>(
  NonInjectedJobMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(jobMetricsInjectable, {
        job: props.object,
      }),
      ...props,
    }),
  },
);
