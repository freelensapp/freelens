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
import { createMetricsTimeRangeKey } from "../cluster/overview/time-range-key";
import { ResourceMetrics } from "../resource-metrics";
import styles from "../resource-metrics/metrics-time-range-container.module.css";
import nodeMetricsInjectable from "./metrics.injectable";
import { NodeCharts } from "./node-charts";

import type { Node } from "@freelensapp/kube-object";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<Partial<ClusterMetricData>>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedNodeMetricsDetailsComponent = observer(
  ({ object, metrics, selectedMetricsTimeRange }: KubeObjectDetailsProps<Node> & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();

    return (
      <>
        <div className={`flex ${styles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics tabs={["CPU", "Memory", "Disk", "Pods"]} object={object} metrics={metrics}>
          <NodeCharts />
        </ResourceMetrics>
      </>
    );
  },
);

export const NodeMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Node>>(
  NonInjectedNodeMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
      metrics: di.inject(nodeMetricsInjectable, {
        node: props.object,
        timeRangeKey: createMetricsTimeRangeKey(di.inject(selectedMetricsTimeRangeInjectable).value.get()),
      }),
      ...props,
    }),
  },
);
