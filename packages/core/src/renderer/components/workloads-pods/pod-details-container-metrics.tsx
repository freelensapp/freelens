/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import { TimeRangedResourceMetrics } from "../resource-metrics";
import { ContainerCharts } from "./container-charts";
import podContainerMetricsInjectable from "./container-metrics.injectable";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";

interface ContainerMetricsProps {
  container: Container;
  pod: Pod;
}

interface Dependencies {
  podContainerMetrics: IAsyncComputed<Partial<PodMetricData>>;
}

const NonInjectedPodDetailsContainerMetrics = observer(
  ({ pod, container, podContainerMetrics }: ContainerMetricsProps & Dependencies) => (
    <TimeRangedResourceMetrics object={pod} tabs={["CPU", "Memory", "Filesystem"]} metrics={podContainerMetrics}>
      <ContainerCharts containerName={container.name} />
    </TimeRangedResourceMetrics>
  ),
);

export const PodDetailsContainerMetrics = withInjectables<Dependencies, ContainerMetricsProps>(
  NonInjectedPodDetailsContainerMetrics,
  {
    getProps: (di, props) => ({
      ...props,
      podContainerMetrics: di.inject(podContainerMetricsInjectable, {
        pod: props.pod,
        container: props.container,
      }),
    }),
  },
);
