/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { Spinner } from "@freelensapp/spinner";
import { bytesToUnits, cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { useRef } from "react";
import { getMetricLastPoints } from "../../../common/k8s-api/endpoints/metrics.api";
import activeThemeInjectable from "../../themes/active.injectable";
import { PieChart } from "../chart";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import { ClusterNoMetrics } from "./cluster-no-metrics";
import styles from "./cluster-pie-charts.module.scss";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";
import { createMetricsTimeRangeKey } from "./overview/time-range-key";

import type { Node } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";

import type { ClusterMetricData } from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import type { IAsyncComputed } from "../../../common/utils/async-computed";
import type { LensTheme } from "../../themes/lens-theme";
import type { PieChartData } from "../chart";
import type { SelectedMetricsTimeRange } from "./overview/selected-metrics-time-range.injectable";
import type { SelectedNodeRoleForMetrics } from "./overview/selected-node-role-for-metrics.injectable";

function createLabels(rawLabelData: [string, number | undefined][]): string[] {
  return rawLabelData.map(([key, value]) => `${key}: ${value?.toFixed(2) || "N/A"}`);
}

const checkedBytesToUnits = (value: number | undefined) => (typeof value === "number" ? bytesToUnits(value) : "N/A");

interface Dependencies {
  selectedNodeRoleForMetrics: SelectedNodeRoleForMetrics;
  clusterOverviewMetrics: IAsyncComputed<Partial<ClusterMetricData> | undefined>;
  activeTheme: IComputedValue<LensTheme>;
  selectedMetricsTimeRange: SelectedMetricsTimeRange;
}

const renderLimitWarning = () => (
  <div className="node-warning flex gap-4 items-center">
    <Icon material="info" />
    <p>Specified limits are higher than node capacity!</p>
  </div>
);

const renderCharts = (defaultColor: string, lastPoints: Partial<Record<keyof ClusterMetricData, number>>) => {
  const {
    memoryUsage,
    memoryRequests,
    memoryAllocatableCapacity,
    memoryCapacity,
    memoryLimits,
    cpuUsage,
    cpuRequests,
    cpuAllocatableCapacity,
    cpuCapacity,
    cpuLimits,
    podUsage,
    podAllocatableCapacity,
    podCapacity,
  } = lastPoints;

  if (
    typeof cpuCapacity !== "number" ||
    typeof cpuAllocatableCapacity !== "number" ||
    typeof podCapacity !== "number" ||
    typeof podAllocatableCapacity !== "number" ||
    typeof memoryAllocatableCapacity !== "number" ||
    typeof memoryCapacity !== "number" ||
    typeof memoryUsage !== "number" ||
    typeof memoryRequests !== "number"
  ) {
    return null;
  }

  const cpuData: PieChartData = {
    datasets: [
      {
        data: [cpuUsage, cpuUsage ? cpuAllocatableCapacity - cpuUsage : 1],
        backgroundColor: ["#c93dce", defaultColor],
        id: "cpuUsage",
        label: "Usage",
      },
      {
        data: [cpuRequests, cpuRequests ? cpuAllocatableCapacity - cpuRequests : 1],
        backgroundColor: ["#4caf50", defaultColor],
        id: "cpuRequests",
        label: "Requests",
      },
      {
        data: [cpuLimits, Math.max(0, cpuAllocatableCapacity - (cpuLimits ?? cpuAllocatableCapacity))],
        backgroundColor: ["#00a7a0", defaultColor],
        id: "cpuLimits",
        label: "Limits",
      },
    ],
    labels: createLabels([
      ["Usage", cpuUsage],
      ["Requests", cpuRequests],
      ["Limits", cpuLimits],
      ["Allocatable Capacity", cpuAllocatableCapacity],
      ["Capacity", cpuCapacity],
    ]),
  };
  const memoryData: PieChartData = {
    datasets: [
      {
        data: [memoryUsage, memoryUsage ? memoryAllocatableCapacity - memoryUsage : 1],
        backgroundColor: ["#c93dce", defaultColor],
        id: "memoryUsage",
        label: "Usage",
      },
      {
        data: [memoryRequests, memoryRequests ? memoryAllocatableCapacity - memoryRequests : 1],
        backgroundColor: ["#4caf50", defaultColor],
        id: "memoryRequests",
        label: "Requests",
      },
      {
        data: [memoryLimits, Math.max(0, memoryAllocatableCapacity - (memoryLimits ?? memoryAllocatableCapacity))],
        backgroundColor: ["#00a7a0", defaultColor],
        id: "memoryLimits",
        label: "Limits",
      },
    ],
    labels: [
      `Usage: ${bytesToUnits(memoryUsage)}`,
      `Requests: ${bytesToUnits(memoryRequests)}`,
      `Limits: ${checkedBytesToUnits(memoryLimits)}`,
      `Allocatable Capacity: ${bytesToUnits(memoryAllocatableCapacity)}`,
      `Capacity: ${bytesToUnits(memoryCapacity)}`,
    ],
  };
  const podsData: PieChartData = {
    datasets: [
      {
        data: [podUsage, podUsage ? podAllocatableCapacity - podUsage : 1],
        backgroundColor: ["#4caf50", defaultColor],
        id: "podUsage",
        label: "Usage",
        tooltipLabels: [(percent) => `Usage: ${percent}`, (percent) => `Available: ${percent}`],
      },
    ],
    labels: [`Usage: ${podUsage || 0}`, `Capacity: ${podAllocatableCapacity}`],
  };

  return (
    <div className="flex justify-center grow shrink-0 basis-0 gap-2">
      <div className={cssNames(styles.chart, "flex flex-col items-center grow shrink-0 basis-0")}>
        <PieChart
          data={cpuData}
          title="CPU"
          legendColors={["#c93dce", "#4caf50", "#00a7a0", "#032b4d", defaultColor]}
        />
        {(cpuLimits ?? cpuAllocatableCapacity) > cpuAllocatableCapacity && renderLimitWarning()}
      </div>
      <div className={cssNames(styles.chart, "flex flex-col items-center grow shrink-0 basis-0")}>
        <PieChart
          data={memoryData}
          title="Memory"
          legendColors={["#c93dce", "#4caf50", "#00a7a0", "#032b4d", defaultColor]}
        />
        {(memoryLimits ?? memoryAllocatableCapacity) > memoryAllocatableCapacity && renderLimitWarning()}
      </div>
      <div className={cssNames(styles.chart, "flex flex-col items-center grow shrink-0 basis-0")}>
        <PieChart data={podsData} title="Pods" legendColors={["#4caf50", defaultColor]} />
      </div>
    </div>
  );
};

const renderContent = (defaultColor: string, nodes: Node[], metrics: Partial<ClusterMetricData> | undefined) => {
  if (!nodes.length) {
    return (
      <div className={cssNames(styles.empty, "flex flex-col grow shrink-0 basis-0 items-center justify-center")}>
        <Icon material="info" />
        No Nodes Available.
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={cssNames(styles.empty, "flex justify-center items-center grow shrink-0 basis-0")}>
        <Spinner />
      </div>
    );
  }

  const lastPoints = getMetricLastPoints(metrics);
  const { memoryCapacity, cpuCapacity, podCapacity } = lastPoints;

  if (!memoryCapacity || !cpuCapacity || !podCapacity) {
    return (
      <div className={styles.noMetrics}>
        <ClusterNoMetrics className={styles.empty} />
      </div>
    );
  }

  return renderCharts(defaultColor, lastPoints);
};

const NonInjectedClusterPieCharts = observer(
  ({ selectedNodeRoleForMetrics, clusterOverviewMetrics, activeTheme, selectedMetricsTimeRange }: Dependencies) => {
    const currentRangeKey = createMetricsTimeRangeKey(selectedMetricsTimeRange.value.get());
    const lastResolvedRangeKeyRef = useRef<string | undefined>(undefined);
    const isPending = clusterOverviewMetrics.pending.get();

    if (!isPending) {
      lastResolvedRangeKeyRef.current = currentRangeKey;
    }

    const visibleMetrics =
      isPending && currentRangeKey !== lastResolvedRangeKeyRef.current ? undefined : clusterOverviewMetrics.value.get();

    return (
      <div className="flex">
        {renderContent(
          activeTheme.get().colors.pieChartDefaultColor,
          selectedNodeRoleForMetrics.nodes.get(),
          visibleMetrics,
        )}
      </div>
    );
  },
);

export const ClusterPieCharts = withInjectables<Dependencies>(NonInjectedClusterPieCharts, {
  getProps: (di) => ({
    activeTheme: di.inject(activeThemeInjectable),
    clusterOverviewMetrics: di.inject(clusterOverviewMetricsInjectable),
    selectedNodeRoleForMetrics: di.inject(selectedNodeRoleForMetricsInjectable),
    selectedMetricsTimeRange: di.inject(selectedMetricsTimeRangeInjectable),
  }),
});
