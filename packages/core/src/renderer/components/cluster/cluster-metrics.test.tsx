/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import { computed, observable } from "mobx";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../../themes/active.injectable";
import { renderFor } from "../test-utils/renderFor";
import { ClusterMetrics } from "./cluster-metrics";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedMetricsTypeInjectable from "./overview/selected-metrics-type.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";

const barChartMock = vi.fn();
const switchersMock = vi.fn();

vi.mock("../chart", () => ({
  BarChart: (props: unknown) => {
    barChartMock(props);

    return <div data-testid="cluster-bar-chart" />;
  },
}));

vi.mock("@freelensapp/spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock("./cluster-metric-switchers", () => ({
  ClusterMetricSwitchers: (props: unknown) => {
    switchersMock(props);

    return <div data-testid="cluster-switchers" />;
  },
}));

function metricWithValue(value: string): MetricData {
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

describe("ClusterMetrics", () => {
  beforeEach(() => {
    barChartMock.mockReset();
    switchersMock.mockReset();
  });

  it("hides stale cluster chart data on first mount when the singleton is pending", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => ({ duration: null, customStart: 300, customEnd: 400 })),
          timestamps: computed(() => ({ start: 300, end: 400, range: 100 })),
        }) as never,
    );
    di.override(
      clusterOverviewMetricsInjectable,
      () =>
        ({
          pending: computed(() => true),
          value: computed(() => ({
            cpuUsage: metricWithValue("1"),
            cpuCapacity: metricWithValue("10"),
            memoryUsage: metricWithValue("2"),
            memoryCapacity: metricWithValue("20"),
          })),
        }) as never,
    );
    di.override(selectedMetricsTypeInjectable, () => ({
      value: computed(() => "cpu" as const),
      set: vi.fn(),
    }));
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [{ getName: () => "worker-1" }] as never),
      hasMasterNodes: computed(() => true),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterMetrics />);

    expect(screen.queryByTestId("cluster-bar-chart")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("hides stale cluster chart data until the new range resolves", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    const timeRange = observable.box({ duration: null, customStart: 100, customEnd: 200 });
    const pending = observable.box(false);
    const metricsValue = observable.box({
      cpuUsage: metricWithValue("1"),
      cpuCapacity: metricWithValue("10"),
      memoryUsage: metricWithValue("2"),
      memoryCapacity: metricWithValue("20"),
    });

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => timeRange.get()),
          timestamps: computed(() => {
            const value = timeRange.get();

            return {
              start: value.customStart ?? 0,
              end: value.customEnd ?? 0,
              range: (value.customEnd ?? 0) - (value.customStart ?? 0),
            };
          }),
        }) as never,
    );
    di.override(
      clusterOverviewMetricsInjectable,
      () =>
        ({
          pending: computed(() => pending.get()),
          value: computed(() => metricsValue.get()),
        }) as never,
    );
    di.override(selectedMetricsTypeInjectable, () => ({
      value: computed(() => "cpu" as const),
      set: vi.fn(),
    }));
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [{ getName: () => "worker-1" }] as never),
      hasMasterNodes: computed(() => true),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterMetrics />);

    expect(screen.getByTestId("cluster-bar-chart")).toBeInTheDocument();

    act(() => {
      pending.set(true);
      timeRange.set({ duration: null, customStart: 300, customEnd: 400 });
    });

    expect(screen.queryByTestId("cluster-bar-chart")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    act(() => {
      metricsValue.set({
        cpuUsage: metricWithValue("3"),
        cpuCapacity: metricWithValue("30"),
        memoryUsage: metricWithValue("4"),
        memoryCapacity: metricWithValue("40"),
      });
      pending.set(false);
    });

    expect(screen.getByTestId("cluster-bar-chart")).toBeInTheDocument();
  });

  it("derives cpu and memory availability from the currently visible metrics", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => ({ duration: 300, customStart: undefined, customEnd: undefined })),
          timestamps: computed(() => ({ start: 10, end: 310, range: 300 })),
        }) as never,
    );
    di.override(
      clusterOverviewMetricsInjectable,
      () =>
        ({
          pending: computed(() => false),
          value: computed(() => ({
            cpuUsage: undefined,
            cpuCapacity: undefined,
            memoryUsage: metricWithValue("2"),
            memoryCapacity: metricWithValue("20"),
          })),
        }) as never,
    );
    di.override(selectedMetricsTypeInjectable, () => ({
      value: computed(() => "memory" as const),
      set: vi.fn(),
    }));
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [{ getName: () => "worker-1" }] as never),
      hasMasterNodes: computed(() => true),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterMetrics />);

    expect(switchersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCPUMetrics: false,
        hasMemoryMetrics: true,
      }),
    );
  });

  describe("overview style", () => {
    const setup = () => {
      const di = getDiForUnitTesting();
      const render = renderFor(di);

      di.override(activeThemeInjectable, () =>
        computed(() => ({ colors: { primary: "#112233", magenta: "#445566", textColorAccent: "#ffffff" } }) as never),
      );
      di.override(
        selectedMetricsTimeRangeInjectable,
        () =>
          ({
            value: computed(() => ({ duration: 300, customStart: undefined, customEnd: undefined })),
            timestamps: computed(() => ({ start: 10, end: 310, range: 300 })),
          }) as never,
      );
      di.override(
        clusterOverviewMetricsInjectable,
        () =>
          ({
            pending: computed(() => false),
            value: computed(() => ({
              cpuUsage: metricWithValue("1"),
              cpuRequests: metricWithValue("2"),
              cpuAllocatableCapacity: metricWithValue("3"),
              cpuCapacity: metricWithValue("4"),
              memoryUsage: metricWithValue("5"),
              memoryCapacity: metricWithValue("8"),
            })),
          }) as never,
      );
      di.override(selectedMetricsTypeInjectable, () => ({
        value: computed(() => "cpu" as const),
        set: vi.fn(),
      }));
      di.override(selectedNodeRoleForMetricsInjectable, () => ({
        value: computed(() => "worker" as const),
        set: vi.fn(),
        nodes: computed(() => [{ getName: () => "worker-1" }] as never),
        hasMasterNodes: computed(() => true),
        hasWorkerNodes: computed(() => true),
      }));

      return { state: di.inject(userPreferencesStateInjectable), render };
    };

    const lastBarChartProps = () =>
      barChartMock.mock.calls.at(-1)?.[0] as {
        showLegend: boolean;
        data: { datasets: { id: string; type?: string; borderColor: string; borderDash?: number[]; data: unknown }[] };
      };

    it("draws the metric as a line in the accent of the theme, with requests and allocatable as dashed lines, with the cards style", () => {
      const { state, render } = setup();

      state.overviewStyle = "cards";
      render(<ClusterMetrics />);

      const { datasets } = lastBarChartProps().data;

      expect(datasets.map(({ id }) => id)).toEqual(["cpuworker", "cpuworker-requests", "cpuworker-allocatable"]);
      expect(datasets[0]).toMatchObject({ type: "line", borderColor: "#112233" });
      expect(datasets[1]).toMatchObject({
        borderColor: "#112233",
        borderDash: [5, 4],
        data: [
          { x: 10000, y: 2 },
          { x: 310000, y: 2 },
        ],
      });
      expect(datasets[2]).toMatchObject({ borderColor: "#ffffff", borderDash: [5, 4] });
      expect(lastBarChartProps().showLegend).toBe(true);
    });

    it("keeps the bars of today by default", () => {
      const { render } = setup();

      render(<ClusterMetrics />);

      const { datasets } = lastBarChartProps().data;

      expect(datasets).toHaveLength(1);
      expect(datasets[0]).toMatchObject({ id: "cpuworker", borderColor: "#00a7a0" });
      expect(datasets[0].type).toBeUndefined();
      expect(lastBarChartProps().showLegend).toBe(false);
    });

    it("switches between the line and the bars while the overview is open", () => {
      const { state, render } = setup();

      render(<ClusterMetrics />);

      act(() => {
        state.overviewStyle = "cards";
      });

      expect(lastBarChartProps().data.datasets).toHaveLength(3);

      act(() => {
        state.overviewStyle = "charts";
      });

      expect(lastBarChartProps().data.datasets).toHaveLength(1);
    });
  });
});
