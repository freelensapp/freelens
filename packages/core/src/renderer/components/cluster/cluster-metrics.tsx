/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Spinner } from "@freelensapp/spinner";
import { bytesToUnits, cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { merge } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useRef, useState } from "react";
import { getMetricLastPoints, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import overviewStyleInjectable from "../../../features/user-preferences/common/overview-style.injectable";
import activeThemeInjectable from "../../themes/active.injectable";
import { BarChart } from "../chart";
import { ZebraStripesPlugin } from "../chart/zebra-stripes.plugin";
import { ClusterMetricSwitchers } from "./cluster-metric-switchers";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import styles from "./cluster-metrics.module.scss";
import { getClusterMetricsLineDatasets } from "./cluster-metrics-line-datasets";
import { ClusterNoMetrics } from "./cluster-no-metrics";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedMetricsTypeInjectable from "./overview/selected-metrics-type.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";
import { createMetricsTimeRangeKey } from "./overview/time-range-key";

import type { ChartOptions, ChartType, TooltipItem } from "chart.js";
import type { IComputedValue } from "mobx";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { OverviewStylePreference } from "../../../features/user-preferences/common/preferences-helpers";
import type { LensTheme } from "../../themes/lens-theme";
import type { ChartDataSets } from "../chart/chart";
import type { SelectedMetricsTimeRange } from "./overview/selected-metrics-time-range.injectable";
import type { SelectedMetricsType } from "./overview/selected-metrics-type.injectable";
import type { SelectedNodeRoleForMetrics } from "./overview/selected-node-role-for-metrics.injectable";

interface Dependencies {
  clusterOverviewMetrics: IAsyncComputed<Partial<ClusterMetricData> | undefined>;
  selectedMetricsType: SelectedMetricsType;
  selectedNodeRoleForMetrics: SelectedNodeRoleForMetrics;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
  activeTheme: IComputedValue<LensTheme>;
  overviewStyle: IComputedValue<OverviewStylePreference>;
}

const NonInjectedClusterMetrics = observer((props: Dependencies) => {
  const {
    clusterOverviewMetrics,
    selectedMetricsType,
    selectedNodeRoleForMetrics,
    selectedMetricsTimeRange,
    activeTheme,
    overviewStyle,
  } = props;
  const currentRangeKey = createMetricsTimeRangeKey(selectedMetricsTimeRange.value.get());
  const lastResolvedRangeKeyRef = useRef<string | undefined>(undefined);
  const isPending = clusterOverviewMetrics.pending.get();

  if (!isPending) {
    lastResolvedRangeKeyRef.current = currentRangeKey;
  }

  const visibleMetrics =
    isPending && currentRangeKey !== lastResolvedRangeKeyRef.current ? undefined : clusterOverviewMetrics.value.get();
  const { start: minTime, end: maxTime, step } = selectedMetricsTimeRange.timestamps.get();
  const [plugins] = useState([new ZebraStripesPlugin()]);
  const {
    memoryCapacity,
    cpuCapacity,
    cpuRequests,
    cpuAllocatableCapacity,
    memoryRequests,
    memoryAllocatableCapacity,
  } = getMetricLastPoints(visibleMetrics ?? {});
  const metricType = selectedMetricsType.value.get();
  const metricNodeRole = selectedNodeRoleForMetrics.value.get();
  const hasCPUMetrics = normalizeMetrics(visibleMetrics?.cpuUsage).data.result[0].values.length > 0;
  const hasMemoryMetrics = normalizeMetrics(visibleMetrics?.memoryUsage).data.result[0].values.length > 0;
  const metricValues =
    metricType === "cpu"
      ? normalizeMetrics(visibleMetrics?.cpuUsage).data.result[0].values
      : normalizeMetrics(visibleMetrics?.memoryUsage).data.result[0].values;
  const colors = { cpu: "#00a7a0", memory: "#C93DCE" };
  const data = metricValues.map((value) => ({
    x: value[0] * 1000, // Convert Unix seconds to milliseconds for Chart.js
    y: parseFloat(value[1]).toFixed(3),
  }));

  const isCards = overviewStyle.get() === "cards";
  const id = metricType + metricNodeRole;
  const label = `${metricType.toUpperCase()} usage`;
  const themeColors = activeTheme.get().colors;
  const lineColor = metricType === "cpu" ? themeColors.primary : themeColors.magenta;

  // The cards style draws the metric as a line in the colors of the theme, with the requests and
  // what is allocatable as dashed reference lines; the charts style keeps the bars.
  const datasets: ChartDataSets[] = isCards
    ? getClusterMetricsLineDatasets({
        id,
        label,
        color: lineColor,
        data,
        references: [
          { name: "Requests", value: metricType === "cpu" ? cpuRequests : memoryRequests, color: lineColor },
          {
            name: "Allocatable",
            value: metricType === "cpu" ? cpuAllocatableCapacity : memoryAllocatableCapacity,
            color: themeColors.textColorAccent,
          },
        ],
        fromX: minTime ? minTime * 1000 : undefined,
        toX: maxTime ? maxTime * 1000 : undefined,
      })
    : [
        {
          id,
          label,
          borderColor: colors[metricType],
          data,
        },
      ];
  const cpuOptions: ChartOptions = {
    scales: {
      y: {
        suggestedMax: cpuCapacity,
        ticks: {
          callback: (value) => value,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<ChartType>) => {
            if (!context.dataIndex) {
              return "<unknown>";
            }

            const value = context.parsed.y;

            return value?.toString() ?? "<unknown>";
          },
        },
      },
    },
  };
  const memoryOptions: ChartOptions = {
    scales: {
      y: {
        suggestedMax: memoryCapacity,
        ticks: {
          callback: (value) => (!value ? 0 : bytesToUnits(parseInt(`${value}`))),
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<ChartType>) => {
            if (!context.dataIndex) {
              return "<unknown>";
            }

            const value = context.parsed.y;

            return bytesToUnits(parseInt(`${value}`), { precision: 3 });
          },
        },
      },
    },
  };
  const metricOptions = metricType === "cpu" ? cpuOptions : memoryOptions;
  // The reference lines are constant and named in the legend, so the tooltip shows the metric only.
  const options: ChartOptions = isCards
    ? merge({}, metricOptions, {
        plugins: { tooltip: { filter: (item: TooltipItem<ChartType>) => item.datasetIndex === 0 } },
      })
    : metricOptions;

  const renderMetrics = () => {
    if (!metricValues.length && isPending) {
      return <Spinner center />;
    }

    const selectedCapacity = metricType === "cpu" ? cpuCapacity : memoryCapacity;

    if (!selectedCapacity) {
      return <ClusterNoMetrics className={styles.empty} />;
    }

    return (
      <BarChart
        key={isCards ? "cards" : "charts"}
        name={`${metricNodeRole}-${metricType}`}
        options={options}
        data={{ datasets }}
        showLegend={isCards}
        plugins={plugins}
        className={styles.chart}
        minTime={minTime}
        maxTime={maxTime}
        step={step}
      />
    );
  };

  return (
    <div className={cssNames(styles.ClusterMetrics, "flex flex-col")}>
      <ClusterMetricSwitchers hasCPUMetrics={hasCPUMetrics} hasMemoryMetrics={hasMemoryMetrics} />
      {renderMetrics()}
    </div>
  );
});

export const ClusterMetrics = withInjectables<Dependencies>(NonInjectedClusterMetrics, {
  getProps: (di) => ({
    clusterOverviewMetrics: di.inject(clusterOverviewMetricsInjectable),
    selectedMetricsType: di.inject(selectedMetricsTypeInjectable),
    selectedNodeRoleForMetrics: di.inject(selectedNodeRoleForMetricsInjectable),
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
    activeTheme: di.inject(activeThemeInjectable),
    overviewStyle: di.inject(overviewStyleInjectable),
  }),
});
