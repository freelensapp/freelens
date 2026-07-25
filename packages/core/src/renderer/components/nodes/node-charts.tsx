/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { mapValues } from "es-toolkit";
import { observer } from "mobx-react";
import { useContext } from "react";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import activeThemeInjectable from "../../themes/active.injectable";
import { BarChart } from "../chart";
import { type MetricsTab, metricTabOptions } from "../chart/options";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { NoMetrics } from "../resource-metrics/no-metrics";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { ChartDataSets } from "../chart";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";

export interface NodeChartsProps {}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const convertNodeMetricValuesToChartData = (values: Array<[number, string]>) =>
  values.map(([x, y]) => ({ x: x * 1000, y }));

const NonInjectedNodeCharts = observer(({ activeTheme, selectedMetricsTimeRange }: Dependencies & NodeChartsProps) => {
  const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};
  const { start: minTime, end: maxTime } = selectedMetricsTimeRange.timestamps.get();

  if (!metrics || !object || !tab) return null;
  if (isMetricsEmpty(metrics)) return <NoMetrics />;

  const id = object.getId();
  const { chartCapacityColor } = activeTheme.get().colors;
  const {
    memoryUsage,
    workloadMemoryUsage,
    memoryRequests,
    memoryCapacity,
    memoryAllocatableCapacity,
    cpuUsage,
    cpuRequests,
    cpuCapacity,
    cpuAllocatableCapacity,
    podUsage,
    podCapacity,
    fsSize,
    fsUsage,
  } = mapValues(metrics, (metric) => normalizeMetrics(metric).data.result[0].values);

  const datasets: Partial<Record<MetricsTab, ChartDataSets[]>> = {
    CPU: [
      {
        id: `${id}-cpuUsage`,
        label: `Usage`,
        tooltip: `CPU cores usage`,
        borderColor: "#00a7a0",
        data: convertNodeMetricValuesToChartData(cpuUsage),
      },
      {
        id: `${id}-cpuRequests`,
        label: `Requests`,
        tooltip: `CPU requests`,
        borderColor: "#30b24d",
        data: convertNodeMetricValuesToChartData(cpuRequests),
      },
      {
        id: `${id}-cpuAllocatableCapacity`,
        label: `Allocatable Capacity`,
        tooltip: `CPU allocatable capacity`,
        borderColor: "#032b4d",
        data: convertNodeMetricValuesToChartData(cpuAllocatableCapacity),
      },
      {
        id: `${id}-cpuCapacity`,
        label: `Capacity`,
        tooltip: `CPU capacity`,
        borderColor: chartCapacityColor,
        data: convertNodeMetricValuesToChartData(cpuCapacity),
      },
    ],
    Memory: [
      {
        id: `${id}-memoryUsage`,
        label: `Usage`,
        tooltip: `Memory usage`,
        borderColor: "#c93dce",
        data: convertNodeMetricValuesToChartData(memoryUsage),
      },
      {
        id: `${id}-workloadMemoryUsage`,
        label: `Workload Memory Usage`,
        tooltip: `Workload memory usage`,
        borderColor: "#9cd3ce",
        data: convertNodeMetricValuesToChartData(workloadMemoryUsage),
      },
      {
        id: "memoryRequests",
        label: `Requests`,
        tooltip: `Memory requests`,
        borderColor: "#30b24d",
        data: convertNodeMetricValuesToChartData(memoryRequests),
      },
      {
        id: `${id}-memoryAllocatableCapacity`,
        label: `Allocatable Capacity`,
        tooltip: `Memory allocatable capacity`,
        borderColor: "#032b4d",
        data: convertNodeMetricValuesToChartData(memoryAllocatableCapacity),
      },
      {
        id: `${id}-memoryCapacity`,
        label: `Capacity`,
        tooltip: `Memory capacity`,
        borderColor: chartCapacityColor,
        data: convertNodeMetricValuesToChartData(memoryCapacity),
      },
    ],
    Disk: [
      {
        id: `${id}-fsUsage`,
        label: `Usage`,
        tooltip: `Node filesystem usage in bytes`,
        borderColor: "#ffc63d",
        data: convertNodeMetricValuesToChartData(fsUsage),
      },
      {
        id: `${id}-fsSize`,
        label: `Size`,
        tooltip: `Node filesystem size in bytes`,
        borderColor: chartCapacityColor,
        data: convertNodeMetricValuesToChartData(fsSize),
      },
    ],
    Pods: [
      {
        id: `${id}-podUsage`,
        label: `Usage`,
        tooltip: `Number of running Pods`,
        borderColor: "#30b24d",
        data: convertNodeMetricValuesToChartData(podUsage),
      },
      {
        id: `${id}-podCapacity`,
        label: `Capacity`,
        tooltip: `Node Pods capacity`,
        borderColor: chartCapacityColor,
        data: convertNodeMetricValuesToChartData(podCapacity),
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

export const NodeCharts = withInjectables<Dependencies, NodeChartsProps>(NonInjectedNodeCharts, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
  }),
});
