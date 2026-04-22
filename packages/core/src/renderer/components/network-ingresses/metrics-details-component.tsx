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
import { createMetricsTimeRangeKey } from "../cluster/overview/time-range-key";
import { ResourceMetrics } from "../resource-metrics";
import styles from "../resource-metrics/metrics-time-range-container.module.css";
import { IngressCharts } from "./ingress-charts";
import ingressMetricsInjectable from "./metrics.injectable";

import type { Ingress } from "@freelensapp/kube-object";

import type { IngressMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";
import type { KubeObjectDetailsProps } from "../kube-object-details";

interface Dependencies {
  metrics: IAsyncComputed<IngressMetricData>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedIngressMetricsDetailsComponent = observer(
  ({ object, metrics, selectedMetricsTimeRange }: KubeObjectDetailsProps<Ingress> & Dependencies) => {
    const timeRangeLabel = selectedMetricsTimeRange.displayLabel.get();

    return (
      <>
        <div className={`flex ${styles.timeRangeContainer}`} data-time-range={timeRangeLabel}>
          <MetricsTimeRangeSelector displayMode="expanded" />
        </div>
        <ResourceMetrics tabs={["Network", "Duration"]} object={object} metrics={metrics}>
          <IngressCharts />
        </ResourceMetrics>
      </>
    );
  },
);

export const IngressMetricsDetailsComponent = withInjectables<Dependencies, KubeObjectDetailsProps<Ingress>>(
  NonInjectedIngressMetricsDetailsComponent,
  {
    getProps: (di, props) => ({
      selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
      metrics: di.inject(ingressMetricsInjectable, {
        ingress: props.object,
        timeRangeKey: createMetricsTimeRangeKey(di.inject(selectedMetricsTimeRangeInjectable).value.get()),
      }),
      ...props,
    }),
  },
);
