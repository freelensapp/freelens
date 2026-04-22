/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed, observable } from "mobx";
import clusterOverviewMetricsInjectable from "../cluster-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "./selected-metrics-time-range.injectable";
import selectedMetricsTypeInjectable from "./selected-metrics-type.injectable";
import clusterOverviewStorageInjectable from "./storage.injectable";
import { createMetricsTimeRangeKey } from "./time-range-key";

jest.mock("../../../../common/k8s-api/endpoints/metrics.api", () => ({
  normalizeMetrics: (metric: unknown) => metric,
}));

describe("selectedMetricsTypeInjectable", () => {
  it("hides stale cluster metrics while a different custom range is pending", () => {
    const timeRange = observable.box({ duration: null, customStart: 100, customEnd: 200 });
    const storage = {
      get: () => ({ metricType: "cpu" as const }),
      merge: jest.fn(),
    };
    const selectedMetricsTimeRange = {
      value: computed(() => timeRange.get()),
    };
    const overviewStateByKey = observable.map([
      [
        "custom-100-200",
        observable({
          pending: false,
          value: {
            cpuUsage: metricWithValue("1"),
            memoryUsage: metricWithValue("2"),
          },
        }),
      ],
      [
        "custom-300-400",
        observable({
          pending: true,
          value: {
            cpuUsage: metricWithValue("3"),
            memoryUsage: metricWithValue("4"),
          },
        }),
      ],
    ]);
    const selectedMetricsType = selectedMetricsTypeInjectable.instantiate({
      inject: (injectable: unknown, params?: { timeRangeKey: string }) => {
        if (injectable === clusterOverviewStorageInjectable) {
          return storage;
        }

        if (injectable === selectedMetricsTimeRangeInjectable) {
          return selectedMetricsTimeRange;
        }

        if (injectable === clusterOverviewMetricsInjectable) {
          const overviewState = overviewStateByKey.get(params?.timeRangeKey ?? "");

          if (!overviewState) {
            throw new Error(`Unexpected time range key: ${params?.timeRangeKey ?? "<missing>"}`);
          }

          return {
            pending: computed(() => overviewState.pending),
            value: computed(() => overviewState.value),
          };
        }

        throw new Error(`Unexpected injectable: ${String(injectable)}`);
      },
    } as never);

    expect(selectedMetricsType.metrics.get()).toEqual([[1, "1"]]);

    overviewStateByKey.get("custom-100-200")!.pending = true;
    timeRange.set({ duration: null, customStart: 300, customEnd: 400 });

    expect(selectedMetricsType.metrics.get()).toEqual([]);
    expect(selectedMetricsType.hasCPUMetrics.get()).toBe(false);
  });

  it("reads from the current keyed overview metrics source after the range changes", () => {
    const timeRange = observable.box({ duration: null, customStart: 100, customEnd: 200 });
    const storage = {
      get: () => ({ metricType: "cpu" as const }),
      merge: jest.fn(),
    };
    const selectedMetricsTimeRange = {
      value: computed(() => timeRange.get()),
    };
    const overviewStateByKey = observable.map([
      [
        "custom-100-200",
        observable({
          pending: false,
          value: {
            cpuUsage: metricWithValue("1"),
            memoryUsage: metricWithValue("2"),
          },
        }),
      ],
      [
        "custom-300-400",
        observable({
          pending: false,
          value: {
            cpuUsage: metricWithValue("3"),
            memoryUsage: metricWithValue("4"),
          },
        }),
      ],
    ]);
    const injectClusterOverviewMetrics = jest.fn((timeRangeKey: string) => {
      const overviewState = overviewStateByKey.get(timeRangeKey);

      if (!overviewState) {
        throw new Error(`Unexpected time range key: ${timeRangeKey}`);
      }

      return {
        pending: computed(() => overviewState.pending),
        value: computed(() => overviewState.value),
      };
    });
    const selectedMetricsType = selectedMetricsTypeInjectable.instantiate({
      inject: (injectable: unknown, params?: { timeRangeKey: string }) => {
        if (injectable === clusterOverviewStorageInjectable) {
          return storage;
        }

        if (injectable === selectedMetricsTimeRangeInjectable) {
          return selectedMetricsTimeRange;
        }

        if (injectable === clusterOverviewMetricsInjectable) {
          return injectClusterOverviewMetrics(params?.timeRangeKey ?? "");
        }

        throw new Error(`Unexpected injectable: ${String(injectable)}`);
      },
    } as never);

    expect(selectedMetricsType.metrics.get()).toEqual([[1, "1"]]);

    timeRange.set({ duration: null, customStart: 300, customEnd: 400 });

    expect(selectedMetricsType.metrics.get()).toEqual([[1, "3"]]);
    expect(injectClusterOverviewMetrics).toHaveBeenCalledWith(createMetricsTimeRangeKey(timeRange.get()));
  });
});

function metricWithValue(value: string) {
  return {
    status: "",
    data: {
      resultType: "",
      result: [
        {
          metric: {},
          values: [[1, value]],
        },
      ],
    },
  };
}
