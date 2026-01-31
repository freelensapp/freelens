/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { toJS } from "mobx";
import { observer } from "mobx-react-lite";
import React from "react";
import { getItemMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import { MetricsTimeRangeSelector } from "../cluster/metrics-time-range-selector";
import { ResourceMetrics } from "../resource-metrics";
import { ContainerCharts } from "./container-charts";
import podContainerMetricsInjectable from "./container-metrics.injectable";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";

interface ContainerMetricsProps {
  container: Container;
  pod: Pod;
}

interface Dependencies {
  podContainerMetrics: IAsyncComputed<PodMetricData>;
}

const NonInjectedPodDetailsContainerMetrics = observer(
  ({ pod, container, podContainerMetrics }: ContainerMetricsProps & Dependencies) => {
    const metricsData = podContainerMetrics.value.get();
    const metrics = metricsData ? getItemMetrics(toJS(metricsData), container.name) : null;

    return (
      <>
        <div className="flex" style={{ marginBottom: "var(--margin)", justifyContent: "flex-end" }}>
          <MetricsTimeRangeSelector />
        </div>
        {metrics ? (
          <ResourceMetrics object={pod} tabs={["CPU", "Memory", "Filesystem"]} metrics={metrics}>
            <ContainerCharts />
          </ResourceMetrics>
        ) : (
          <div style={{ padding: "var(--padding)", textAlign: "center" }}>Loading metrics...</div>
        )}
      </>
    );
  },
);

export const PodDetailsContainerMetrics = withInjectables<Dependencies, ContainerMetricsProps>(
  NonInjectedPodDetailsContainerMetrics,
  {
    getProps: (di, props) => ({
      ...props,
      podContainerMetrics: di.inject(podContainerMetricsInjectable, { pod: props.pod, container: props.container }),
    }),
  },
);
