/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import { normalizeMetrics } from "../../../../common/k8s-api/endpoints/metrics.api";
import clusterOverviewMetricsInjectable from "../cluster-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "./selected-metrics-time-range.injectable";
import clusterOverviewStorageInjectable from "./storage.injectable";

import type { SelectedMetricsTimeRange } from "./selected-metrics-time-range.injectable";
import type { MetricType } from "./storage.injectable";

export type SelectedMetricsType = ReturnType<(typeof selectedMetricsTypeInjectable)["instantiate"]>;

const selectedMetricsTypeInjectable = getInjectable({
  id: "selected-metrics-type",
  instantiate: (di) => {
    const storage = di.inject(clusterOverviewStorageInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);
    const overviewMetrics = di.inject(clusterOverviewMetricsInjectable, {
      timeRangeKey: createTimeRangeKey(selectedMetricsTimeRange),
    });
    let lastResolvedRangeKey = createTimeRangeKey(selectedMetricsTimeRange);

    const shouldHideMetricsWhilePending = computed(() => {
      const currentRangeKey = createTimeRangeKey(selectedMetricsTimeRange);

      return overviewMetrics.pending.get() && currentRangeKey !== lastResolvedRangeKey;
    });

    const value = computed(() => storage.get().metricType);
    const metrics = computed((): [number, string][] => {
      if (shouldHideMetricsWhilePending.get()) {
        return [];
      }

      const rawValue = overviewMetrics.value.get();

      if (!rawValue) {
        return [];
      }

      if (!overviewMetrics.pending.get()) {
        lastResolvedRangeKey = createTimeRangeKey(selectedMetricsTimeRange);
      }

      const type = value.get();

      switch (type) {
        case "cpu":
          return normalizeMetrics(rawValue.cpuUsage).data.result[0].values;
        case "memory":
          return normalizeMetrics(rawValue.memoryUsage).data.result[0].values;
        default:
          return [];
      }
    });
    const hasCPUMetrics = computed(
      () =>
        !shouldHideMetricsWhilePending.get() &&
        normalizeMetrics(overviewMetrics.value.get()?.cpuUsage).data.result[0].values.length > 0,
    );
    const hasMemoryMetrics = computed(
      () =>
        !shouldHideMetricsWhilePending.get() &&
        normalizeMetrics(overviewMetrics.value.get()?.memoryUsage).data.result[0].values.length > 0,
    );

    return {
      value,
      metrics,
      hasCPUMetrics,
      hasMemoryMetrics,
      set: action((value: MetricType) => {
        storage.merge({ metricType: value });
      }),
    };
  },
});

function createTimeRangeKey(selectedMetricsTimeRange: SelectedMetricsTimeRange) {
  const { duration } = selectedMetricsTimeRange.value.get();

  if (duration !== null) {
    return `duration-${duration}`;
  }

  return "custom-active";
}

export default selectedMetricsTypeInjectable;
