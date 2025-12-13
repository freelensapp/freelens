/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Spinner } from "@freelensapp/spinner";
import { bytesToUnits, cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { getMetricLastPoints } from "../../../common/k8s-api/endpoints/metrics.api";
import { BarChart } from "../chart";
import { ZebraStripesPlugin } from "../chart/zebra-stripes.plugin";
import { ClusterMetricSwitchers } from "./cluster-metric-switchers";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import styles from "./cluster-metrics.module.scss";
import { ClusterNoMetrics } from "./cluster-no-metrics";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedMetricsTypeInjectable from "./overview/selected-metrics-type.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { IAsyncComputed } from "@ogre-tools/injectable-react";
import type { ChartOptions, ChartPoint } from "chart.js";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { SelectedMetricsTimeRange } from "./overview/selected-metrics-time-range.injectable";
import type { SelectedMetricsType } from "./overview/selected-metrics-type.injectable";
import type { SelectedNodeRoleForMetrics } from "./overview/selected-node-role-for-metrics.injectable";

interface Dependencies {
  clusterOverviewMetrics: IAsyncComputed<ClusterMetricData | undefined>;
  selectedMetricsType: SelectedMetricsType;
  selectedNodeRoleForMetrics: SelectedNodeRoleForMetrics;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const NonInjectedClusterMetrics = observer((props: Dependencies) => {
  const { clusterOverviewMetrics, selectedMetricsType, selectedNodeRoleForMetrics, selectedMetricsTimeRange } = props;

  const metrics = clusterOverviewMetrics.value.get();
  const { start: minTime, end: maxTime } = selectedMetricsTimeRange.timestamps.get();
  const [plugins] = useState([new ZebraStripesPlugin()]);
  const { memoryCapacity, cpuCapacity } = getMetricLastPoints(metrics ?? {});
  const metricValues = selectedMetricsType.metrics.get();
  const metricType = selectedMetricsType.value.get();
  const metricNodeRole = selectedNodeRoleForMetrics.value.get();
  const colors = { cpu: "#00a7a0", memory: "#C93DCE" };
  const data = metricValues.map((value) => ({
    x: value[0] * 1000, // Convert Unix seconds to milliseconds for Chart.js
    y: parseFloat(value[1]).toFixed(3),
  }));

  const datasets = [
    {
      id: metricType + metricNodeRole,
      label: `${metricType.toUpperCase()} usage`,
      borderColor: colors[metricType],
      data,
    },
  ];
  const cpuOptions: ChartOptions = {
    scales: {
      yAxes: [
        {
          ticks: {
            suggestedMax: cpuCapacity,
            callback: (value) => value,
          },
        },
      ],
    },
    tooltips: {
      callbacks: {
        label: ({ index }, data) => {
          if (!index) {
            return "<unknown>";
          }

          const value = data.datasets?.[0].data?.[index] as ChartPoint;

          return value.y?.toString() ?? "<unknown>";
        },
      },
    },
  };
  const memoryOptions: ChartOptions = {
    scales: {
      yAxes: [
        {
          ticks: {
            suggestedMax: memoryCapacity,
            callback: (value: string) => (!value ? 0 : bytesToUnits(parseInt(value))),
          },
        },
      ],
    },
    tooltips: {
      callbacks: {
        label: ({ index }, data) => {
          if (!index) {
            return "<unknown>";
          }

          const value = data.datasets?.[0].data?.[index] as ChartPoint;

          return bytesToUnits(parseInt(value.y as string), { precision: 3 });
        },
      },
    },
  };
  const options = metricType === "cpu" ? cpuOptions : memoryOptions;

  const renderMetrics = () => {
    if (!metricValues.length && !metrics) {
      return <Spinner center />;
    }

    if (!memoryCapacity || !cpuCapacity) {
      return <ClusterNoMetrics className={styles.empty} />;
    }

    return (
      <BarChart
        name={`${metricNodeRole}-${metricType}`}
        options={options}
        data={{ datasets }}
        timeLabelStep={5}
        showLegend={false}
        plugins={plugins}
        className={styles.chart}
        minTime={minTime}
        maxTime={maxTime}
      />
    );
  };

  return (
    <div className={cssNames(styles.ClusterMetrics, "flex column")}>
      <ClusterMetricSwitchers />
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
  }),
});
