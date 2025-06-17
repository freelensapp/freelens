/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { ResourceMetrics } from "../resource-metrics";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import deploymentMetricsInjectable from "./metrics.injectable";

import type { Deployment } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

import type { DeploymentPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-deployments.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<DeploymentPodMetricData>;
}

const NonInjectedDeploymentMetricsDetailsComponent = ({
  object,
  metrics,
}: KubeObjectDetailsProps<Deployment> & Dependencies) => (
  <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
    <PodCharts />
  </ResourceMetrics>
);

export const DeploymentMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Deployment>>(
  NonInjectedDeploymentMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      metrics: di.inject(deploymentMetricsInjectable, props.object),
      ...props,
    }),
  },
);
