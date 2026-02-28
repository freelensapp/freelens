/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import React from "react";
import { MetricsTimeRangeSelector } from "../cluster/metrics-time-range-selector";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetrics } from "../resource-metrics";
import podMetricsInjectable from "./metrics.injectable";
import { PodCharts, podMetricTabs } from "./pod-charts";
import styles from "./pod-details-container-metrics.module.css";

import type { Pod } from "@freelensapp/kube-object";

import type { PodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<PodMetricData>>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedPodMetricsDetailsComponent = observer(
  ({ object, metrics, selectedMetricsTimeRange }: KubeObjectDetailsProps<Pod> & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();

    return (
      <>
        <div className={`flex ${styles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
          <PodCharts />
        </ResourceMetrics>
      </>
    );
  },
);

const PodMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Pod>>(
  NonInjectedPodMetricsDetailsComponent,
  {
    getProps: (di, props) => {
      const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

      return {
        metrics: di.inject(podMetricsInjectable, {
          pod: props.object,
          timeRangeKey: createTimeRangeKey(selectedMetricsTimeRange),
        }),
        selectedMetricsTimeRange,
        ...props,
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

export default PodMetricsDetailsComponent;
