/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useContext } from "react";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import activeThemeInjectable from "../../themes/active.injectable";
import { BarChart, memoryOptions } from "../chart";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { NoMetrics } from "../resource-metrics/no-metrics";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { ChartDataSets } from "../chart";
import type { SelectedMetricsTimeRange } from "../cluster/overview/selected-metrics-time-range.injectable";

export interface VolumeClaimDiskChartProps {}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const convertVolumeClaimMetricValuesToChartData = (values: Array<[number, string]>) =>
  values.map(([x, y]) => ({ x: x * 1000, y }));

const NonInjectedVolumeClaimDiskChart = observer(
  ({ activeTheme, selectedMetricsTimeRange }: Dependencies & VolumeClaimDiskChartProps) => {
    const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};
    const { start: minTime, end: maxTime } = selectedMetricsTimeRange.timestamps.get();

    if (!metrics || !object || !tab) return null;
    if (isMetricsEmpty(metrics)) return <NoMetrics />;

    const id = object.getId();
    const { chartCapacityColor } = activeTheme.get().colors;
    const { diskUsage, diskCapacity } = metrics;
    const usage = normalizeMetrics(diskUsage).data.result[0].values;
    const capacity = normalizeMetrics(diskCapacity).data.result[0].values;

    const datasets: ChartDataSets[] = [
      {
        id: `${id}-diskUsage`,
        label: `Usage`,
        tooltip: `Volume disk usage`,
        borderColor: "#ffc63d",
        data: convertVolumeClaimMetricValuesToChartData(usage),
      },
      {
        id: `${id}-diskCapacity`,
        label: `Capacity`,
        tooltip: `Volume disk capacity`,
        borderColor: chartCapacityColor,
        data: convertVolumeClaimMetricValuesToChartData(capacity),
      },
    ];

    return (
      <BarChart
        className="VolumeClaimDiskChart flex flex-col grow shrink-0 basis-0"
        name={`pvc-${object.getName()}-disk`}
        options={memoryOptions}
        data={{ datasets }}
        minTime={minTime}
        maxTime={maxTime}
      />
    );
  },
);

export const VolumeClaimDiskChart = withInjectables<Dependencies, VolumeClaimDiskChartProps>(
  NonInjectedVolumeClaimDiskChart,
  {
    getProps: (di, props) => ({
      ...props,
      activeTheme: di.inject(activeThemeInjectable),
      selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
    }),
  },
);
