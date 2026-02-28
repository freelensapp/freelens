/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import React from "react";
import { MetricsTimeRangeSelector } from "../cluster/metrics-time-range-selector";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetrics } from "../resource-metrics";
import { ContainerCharts } from "./container-charts";
import podContainerMetricsInjectable from "./container-metrics.injectable";
import styles from "./pod-details-container-metrics.module.css";

import type { Container, Pod } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";

interface ContainerMetricsProps {
  container: Container;
  pod: Pod;
}

interface Dependencies {
  podContainerMetrics: IAsyncComputed<Partial<PodMetricData>>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedPodDetailsContainerMetrics = observer(
  ({ pod, container, podContainerMetrics, selectedMetricsTimeRange }: ContainerMetricsProps & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();

    return (
      <>
        <div className={`flex ${styles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics object={pod} tabs={["CPU", "Memory", "Filesystem"]} metrics={podContainerMetrics}>
          <ContainerCharts containerName={container.name} />
        </ResourceMetrics>
      </>
    );
  },
);

export const PodDetailsContainerMetrics = withInjectables<Dependencies, ContainerMetricsProps>(
  NonInjectedPodDetailsContainerMetrics,
  {
    getProps: (di, props) => {
      const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

      return {
        ...props,
        selectedMetricsTimeRange,
        podContainerMetrics: di.inject(podContainerMetricsInjectable, {
          pod: props.pod,
          container: props.container,
          timeRangeKey: createTimeRangeKey(selectedMetricsTimeRange),
        }),
      };
    },
  },
);

function createTimeRangeKey(selectedMetricsTimeRange: SelectedMetricsTimeRange) {
  const { duration } = selectedMetricsTimeRange.value.get();

  if (duration !== null) {
    return `duration-${duration}`;
  }

  return "custom-active";
}
