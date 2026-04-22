/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { type IAsyncComputed, withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react-lite";
import React from "react";
import { MetricsTimeRangeSelector } from "../cluster/metrics-time-range-selector";
import selectedMetricsTimeRangeInjectable, {
  type SelectedMetricsTimeRange,
} from "../cluster/overview/selected-metrics-time-range.injectable";
import { createMetricsTimeRangeKey } from "../cluster/overview/time-range-key";
import { ResourceMetrics } from "../resource-metrics";
import timeRangeStyles from "../resource-metrics/metrics-time-range-container.module.css";
import { PodCharts, podMetricTabs } from "../workloads-pods/pod-charts";
import daemonSetMetricsInjectable from "./metrics.injectable";

import type { DaemonSet } from "@freelensapp/kube-object";

import type { DaemonSetPodMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-daemon-sets.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<DaemonSetPodMetricData>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedDaemonSetMetricsDetailsComponent = observer(
  ({ object, metrics, selectedMetricsTimeRange }: KubeObjectDetailsProps<DaemonSet> & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();

    return (
      <>
        <div className={`flex ${timeRangeStyles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics tabs={podMetricTabs} object={object} metrics={metrics}>
          <PodCharts />
        </ResourceMetrics>
      </>
    );
  },
);

export const DaemonSetMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<DaemonSet>>(
  NonInjectedDaemonSetMetricsDetailsComponent,
  {
    getProps: (di, props) => {
      const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

      return {
        metrics: di.inject(daemonSetMetricsInjectable, {
          daemonSet: props.object,
          timeRangeKey: createMetricsTimeRangeKey(selectedMetricsTimeRange.value.get()),
        }),
        selectedMetricsTimeRange,
        ...props,
      };
    },
  },
);
