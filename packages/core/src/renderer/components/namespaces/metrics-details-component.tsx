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
import namespaceMetricsInjectable from "./metrics.injectable";

import type { Namespace } from "@freelensapp/kube-object";

import type { PodMetricInNamespaceData } from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<PodMetricInNamespaceData>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedNamespaceMetricsDetailsComponent = observer(
  ({ object, metrics, selectedMetricsTimeRange }: KubeObjectDetailsProps<Namespace> & Dependencies) => {
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

export const NamespaceMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Namespace>>(
  NonInjectedNamespaceMetricsDetailsComponent,
  {
    getProps: (di, props) => {
      const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

      return {
        metrics: di.inject(namespaceMetricsInjectable, {
          namespace: props.object,
          timeRangeKey: createMetricsTimeRangeKey(selectedMetricsTimeRange.value.get()),
        }),
        selectedMetricsTimeRange,
        ...props,
      };
    },
  },
);
