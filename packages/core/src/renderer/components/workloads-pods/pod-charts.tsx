/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { mapValues } from "lodash";
import { observer } from "mobx-react";
import React, { useContext } from "react";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import { BarChart } from "../chart";
import { metricTabOptions } from "../chart/options";
import { ResourceMetricsContext } from "../resource-metrics";
import { NoMetrics } from "../resource-metrics/no-metrics";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { ChartDataSets } from "../chart";
import type { MetricsTab } from "../chart/options";
import type { AtLeastOneMetricTab } from "../resource-metrics";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";

export const podMetricTabs: AtLeastOneMetricTab = ["CPU", "Memory", "Network", "Filesystem"];

interface Dependencies {
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedPodCharts = observer(({ selectedMetricsTimeRange }: Dependencies) => {
  const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};
  const { start: minTime, end: maxTime } = selectedMetricsTimeRange.timestamps.get();

  if (!metrics || !object || !tab) return null;
  if (isMetricsEmpty(metrics)) return <NoMetrics />;

  const id = object.getId();
  const { cpuUsage, memoryUsage, fsUsage, fsWrites, fsReads, networkReceive, networkTransmit } = mapValues(
    metrics,
    (metric) => normalizeMetrics(metric).data.result[0].values,
  );

  const datasets: Partial<Record<MetricsTab, ChartDataSets[]>> = {
    CPU: [
      {
        id: `${id}-cpuUsage`,
        label: `Usage`,
        tooltip: `Container CPU cores usage`,
        borderColor: "#00a7a0",
        data: cpuUsage.map(([x, y]) => ({ x: x * 1000, y })),
      },
    ],
    Memory: [
      {
        id: `${id}-memoryUsage`,
        label: `Usage`,
        tooltip: `Container memory usage`,
        borderColor: "#c93dce",
        data: memoryUsage.map(([x, y]) => ({ x: x * 1000, y })),
      },
    ],
    Network: [
      {
        id: `${id}-networkReceive`,
        label: `Receive`,
        tooltip: `Bytes received by all containers`,
        borderColor: "#64c5d6",
        data: networkReceive.map(([x, y]) => ({ x: x * 1000, y })),
      },
      {
        id: `${id}-networkTransmit`,
        label: `Transmit`,
        tooltip: `Bytes transmitted from all containers`,
        borderColor: "#46cd9e",
        data: networkTransmit.map(([x, y]) => ({ x: x * 1000, y })),
      },
    ],
    Filesystem: [
      {
        id: `${id}-fsUsage`,
        label: `Usage`,
        tooltip: `Bytes consumed on this filesystem`,
        borderColor: "#ffc63d",
        data: fsUsage.map(([x, y]) => ({ x: x * 1000, y })),
      },
      {
        id: `${id}-fsWrites`,
        label: `Writes`,
        tooltip: `Bytes written on this filesystem`,
        borderColor: "#ff963d",
        data: fsWrites.map(([x, y]) => ({ x: x * 1000, y })),
      },
      {
        id: `${id}-fsReads`,
        label: `Reads`,
        tooltip: `Bytes read on this filesystem`,
        borderColor: "#fff73d",
        data: fsReads.map(([x, y]) => ({ x: x * 1000, y })),
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

export const PodCharts = withInjectables<Dependencies>(NonInjectedPodCharts, {
  getProps: (di) => ({
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
  }),
});
