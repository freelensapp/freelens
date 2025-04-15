/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { mapValues } from "lodash";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React, { useContext } from "react";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import activeThemeInjectable from "../../themes/active.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import type { ChartDataSets } from "../chart";
import { BarChart } from "../chart";
import { type MetricsTab, metricTabOptions } from "../chart/options";
import { ResourceMetricsContext } from "../resource-metrics";
import { NoMetrics } from "../resource-metrics/no-metrics";

export interface ContainerChartsProps {}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedContainerCharts = observer(({ activeTheme }: Dependencies & ContainerChartsProps) => {
  const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};

  if (!metrics || !object || !tab) return null;
  if (isMetricsEmpty(metrics)) return <NoMetrics />;

  const { chartCapacityColor } = activeTheme.get().colors;
  const { cpuUsage, cpuRequests, cpuLimits, memoryUsage, memoryRequests, memoryLimits, fsUsage, fsWrites, fsReads } =
    mapValues(metrics, (metric) => normalizeMetrics(metric).data.result[0].values);

  const datasets: Partial<Record<MetricsTab, ChartDataSets[]>> = {
    CPU: [
      {
        id: "cpuUsage",
        label: `Usage`,
        tooltip: `CPU cores usage`,
        borderColor: "#00a7a0",
        data: cpuUsage.map(([x, y]) => ({ x, y })),
      },
      {
        id: "cpuRequests",
        label: `Requests`,
        tooltip: `CPU requests`,
        borderColor: "#30b24d",
        data: cpuRequests.map(([x, y]) => ({ x, y })),
      },
      {
        id: "cpuLimits",
        label: `Limits`,
        tooltip: `CPU limits`,
        borderColor: chartCapacityColor,
        data: cpuLimits.map(([x, y]) => ({ x, y })),
      },
    ],
    Memory: [
      {
        id: "memoryUsage",
        label: `Usage`,
        tooltip: `Memory usage`,
        borderColor: "#c93dce",
        data: memoryUsage.map(([x, y]) => ({ x, y })),
      },
      {
        id: "memoryRequests",
        label: `Requests`,
        tooltip: `Memory requests`,
        borderColor: "#30b24d",
        data: memoryRequests.map(([x, y]) => ({ x, y })),
      },
      {
        id: "memoryLimits",
        label: `Limits`,
        tooltip: `Memory limits`,
        borderColor: chartCapacityColor,
        data: memoryLimits.map(([x, y]) => ({ x, y })),
      },
    ],
    Filesystem: [
      {
        id: "fsUsage",
        label: `Usage`,
        tooltip: `Bytes consumed on this filesystem`,
        borderColor: "#ffc63d",
        data: fsUsage.map(([x, y]) => ({ x, y })),
      },
      {
        id: "fsWrites",
        label: `Writes`,
        tooltip: `Bytes written on this filesystem`,
        borderColor: "#ff963d",
        data: fsWrites.map(([x, y]) => ({ x, y })),
      },
      {
        id: "fsReads",
        label: `Reads`,
        tooltip: `Bytes read on this filesystem`,
        borderColor: "#fff73d",
        data: fsReads.map(([x, y]) => ({ x, y })),
      },
    ],
  };

  return <BarChart name={`metrics-${tab}`} options={metricTabOptions[tab]} data={{ datasets: datasets[tab] }} />;
});

export const ContainerCharts = withInjectables<Dependencies, ContainerChartsProps>(NonInjectedContainerCharts, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});
