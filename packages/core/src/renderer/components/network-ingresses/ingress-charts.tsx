/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useContext } from "react";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import { BarChart } from "../chart";
import { type MetricsTab, metricTabOptions } from "../chart/options";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { NoMetrics } from "../resource-metrics/no-metrics";

import type { ChartDataSets } from "../chart";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";

interface Dependencies {
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const convertIngressMetricValuesToChartData = (values: Array<[number, string]>) =>
  values.map(([x, y]) => ({ x: x * 1000, y }));

const NonInjectedIngressCharts = observer(({ selectedMetricsTimeRange }: Dependencies) => {
  const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};
  const { start: minTime, end: maxTime } = selectedMetricsTimeRange.timestamps.get();

  if (!metrics || !object || !tab) return null;
  if (isMetricsEmpty(metrics)) return <NoMetrics />;

  const id = object.getId();
  const values = Object.values(metrics)
    .map(normalizeMetrics)
    .map(({ data }) => data.result[0].values);
  const [bytesSentSuccess, bytesSentFailure, requestDurationSeconds, responseDurationSeconds] = values;

  const datasets: Partial<Record<MetricsTab, ChartDataSets[]>> = {
    Network: [
      {
        id: `${id}-bytesSentSuccess`,
        label: `Bytes sent, status 2xx`,
        tooltip: `Bytes sent by Ingress controller with successful status`,
        borderColor: "#46cd9e",
        data: convertIngressMetricValuesToChartData(bytesSentSuccess),
      },
      {
        id: `${id}-bytesSentFailure`,
        label: `Bytes sent, status 5xx`,
        tooltip: `Bytes sent by Ingress controller with error status`,
        borderColor: "#cd465a",
        data: convertIngressMetricValuesToChartData(bytesSentFailure),
      },
    ],
    Duration: [
      {
        id: `${id}-requestDurationSeconds`,
        label: `Request`,
        tooltip: `Request duration in seconds`,
        borderColor: "#48b18d",
        data: convertIngressMetricValuesToChartData(requestDurationSeconds),
      },
      {
        id: `${id}-responseDurationSeconds`,
        label: `Response`,
        tooltip: `Response duration in seconds`,
        borderColor: "#73ba3c",
        data: convertIngressMetricValuesToChartData(responseDurationSeconds),
      },
    ],
  };

  return (
    <BarChart
      name={`${object.getName()}-metric-${tab}`}
      options={metricTabOptions[tab]}
      data={{ datasets: datasets[tab] }}
      minTime={minTime}
      maxTime={maxTime}
    />
  );
});

export const IngressCharts = withInjectables<Dependencies>(NonInjectedIngressCharts, {
  getProps: (di) => ({
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
  }),
});
