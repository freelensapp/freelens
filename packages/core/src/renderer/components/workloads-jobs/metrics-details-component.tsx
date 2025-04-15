/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Job } from "@freelensapp/kube-object";
import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import type { JobPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-jobs.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { ResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import jobMetricsInjectable from "./metrics.injectable";

interface Dependencies {
  metrics: IAsyncComputed<JobPodMetricData>;
}

const NonInjectedJobMetricsDetailsComponent = ({ object, metrics }: KubeObjectDetailsProps<Job> & Dependencies) => (
  <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
    <PodCharts />
  </ResourceMetrics>
);

export const JobMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Job>>(
  NonInjectedJobMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(jobMetricsInjectable, props.object),
      ...props,
    }),
  },
);
