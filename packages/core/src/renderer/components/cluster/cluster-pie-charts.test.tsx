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
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import { ClusterPieCharts } from "./cluster-pie-charts";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";

const pieChartMock = vi.fn();

vi.mock("../chart", () => ({
  PieChart: (props: unknown) => {
    pieChartMock(props);

    return <div data-testid="cluster-pie-chart" />;
  },
}));

vi.mock("@freelensapp/spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
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

describe("ClusterPieCharts", () => {
  beforeEach(() => {
    pieChartMock.mockReset();
  });

  it("does not render stale pie charts on first mount while a reused singleton is pending", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(activeThemeInjectable, () =>
      computed(
        () =>
          ({
            colors: {
              pieChartDefaultColor: "#123456",
            },
          }) as never,
      ),
    );
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => ({ duration: null, customStart: 300, customEnd: 400 })),
        }) as never,
    );
    di.override(
      clusterOverviewMetricsInjectable,
      () =>
        ({
          pending: computed(() => true),
          value: computed(() => ({
            cpuUsage: metricWithValue("1"),
            cpuRequests: metricWithValue("2"),
            cpuAllocatableCapacity: metricWithValue("3"),
            cpuCapacity: metricWithValue("4"),
            memoryUsage: metricWithValue("5"),
            memoryRequests: metricWithValue("6"),
            memoryAllocatableCapacity: metricWithValue("7"),
            memoryCapacity: metricWithValue("8"),
            podUsage: metricWithValue("9"),
            podAllocatableCapacity: metricWithValue("10"),
            podCapacity: metricWithValue("11"),
          })),
        }) as never,
    );
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [{ getName: () => "worker-1" }] as never),
      hasMasterNodes: computed(() => true),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterPieCharts />);

    expect(screen.queryByTestId("cluster-pie-chart")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("does not keep rendering stale values during a pending range transition", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    const timeRange = observable.box({ duration: null, customStart: 100, customEnd: 200 });
    const pending = observable.box(false);
    const metricsValue = observable.box({
      cpuUsage: metricWithValue("1"),
      cpuRequests: metricWithValue("2"),
      cpuAllocatableCapacity: metricWithValue("3"),
      cpuCapacity: metricWithValue("4"),
      memoryUsage: metricWithValue("5"),
      memoryRequests: metricWithValue("6"),
      memoryAllocatableCapacity: metricWithValue("7"),
      memoryCapacity: metricWithValue("8"),
      podUsage: metricWithValue("9"),
      podAllocatableCapacity: metricWithValue("10"),
      podCapacity: metricWithValue("11"),
    });

    di.override(activeThemeInjectable, () =>
      computed(
        () =>
          ({
            colors: {
              pieChartDefaultColor: "#123456",
            },
          }) as never,
      ),
    );
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: computed(() => timeRange.get()),
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
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [{ getName: () => "worker-1" }] as never),
      hasMasterNodes: computed(() => true),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterPieCharts />);

    expect(screen.getAllByTestId("cluster-pie-chart")).toHaveLength(3);

    act(() => {
      pending.set(true);
      timeRange.set({ duration: null, customStart: 300, customEnd: 400 });
    });

    expect(screen.queryByTestId("cluster-pie-chart")).not.toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("takes the pod capacity from the status of the nodes when the provider has no metric of it", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    const noSeries: MetricData = { status: "success", data: { resultType: "matrix", result: [] } };
    const node = (capacity: string, allocatable: string) => ({
      getName: () => "worker",
      status: { capacity: { pods: capacity }, allocatable: { pods: allocatable } },
    });

    di.override(activeThemeInjectable, () =>
      computed(() => ({ colors: { pieChartDefaultColor: "#123456" } }) as never),
    );
    di.override(
      selectedMetricsTimeRangeInjectable,
      () => ({ value: computed(() => ({ duration: 300, customStart: undefined, customEnd: undefined })) }) as never,
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
            memoryRequests: metricWithValue("6"),
            memoryAllocatableCapacity: metricWithValue("7"),
            memoryCapacity: metricWithValue("8"),
            podUsage: metricWithValue("9"),
            podAllocatableCapacity: noSeries,
            podCapacity: noSeries,
          })),
        }) as never,
    );
    di.override(selectedNodeRoleForMetricsInjectable, () => ({
      value: computed(() => "worker" as const),
      set: vi.fn(),
      nodes: computed(() => [node("110", "100"), node("32", "30")] as never),
      hasMasterNodes: computed(() => false),
      hasWorkerNodes: computed(() => true),
    }));

    render(<ClusterPieCharts />);

    expect(screen.getAllByTestId("cluster-pie-chart")).toHaveLength(3);
    expect(pieChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pods",
        data: expect.objectContaining({ labels: ["Usage: 9", "Capacity: 130"] }),
      }),
    );
  });

  describe("overview style", () => {
    const setup = () => {
      const di = getDiForUnitTesting();
      const render = renderFor(di);

      di.override(activeThemeInjectable, () =>
        computed(() => ({ colors: { pieChartDefaultColor: "#123456" } }) as never),
      );
      di.override(
        selectedMetricsTimeRangeInjectable,
        () => ({ value: computed(() => ({ duration: 300, customStart: undefined, customEnd: undefined })) }) as never,
      );
      di.override(
        clusterOverviewMetricsInjectable,
        () =>
          ({
            pending: computed(() => false),
            value: computed(() => ({
              cpuUsage: metricWithValue("1"),
              cpuRequests: metricWithValue("2"),
              cpuLimits: metricWithValue("6"),
              cpuAllocatableCapacity: metricWithValue("3"),
              cpuCapacity: metricWithValue("4"),
              memoryUsage: metricWithValue("5"),
              memoryRequests: metricWithValue("6"),
              memoryAllocatableCapacity: metricWithValue("7"),
              memoryCapacity: metricWithValue("8"),
              podUsage: metricWithValue("9"),
              podAllocatableCapacity: metricWithValue("10"),
              podCapacity: metricWithValue("11"),
            })),
          }) as never,
      );
      di.override(selectedNodeRoleForMetricsInjectable, () => ({
        value: computed(() => "worker" as const),
        set: vi.fn(),
        nodes: computed(() => [{ getName: () => "worker-1" }] as never),
        hasMasterNodes: computed(() => true),
        hasWorkerNodes: computed(() => true),
      }));

      return { state: di.inject(userPreferencesStateInjectable), render };
    };

    it("shows the ring charts by default", () => {
      const { render } = setup();

      render(<ClusterPieCharts />);

      expect(screen.getAllByTestId("cluster-pie-chart")).toHaveLength(3);
      expect(screen.queryByTestId("cluster-capacity-cards")).not.toBeInTheDocument();
    });

    it("shows capacity cards instead of the ring charts with the cards style", () => {
      const { state, render } = setup();

      state.overviewStyle = "cards";
      render(<ClusterPieCharts />);

      expect(screen.getByTestId("cluster-capacity-cards")).toBeInTheDocument();
      expect(screen.getByTestId("capacity-card-cpu-overcommit")).toHaveTextContent("Limits 2.0× Allocatable");
      expect(screen.queryByTestId("cluster-pie-chart")).not.toBeInTheDocument();
    });

    it("switches between charts and cards while the overview is open", () => {
      const { state, render } = setup();

      render(<ClusterPieCharts />);

      act(() => {
        state.overviewStyle = "cards";
      });

      expect(screen.getByTestId("cluster-capacity-cards")).toBeInTheDocument();
      expect(screen.queryByTestId("cluster-pie-chart")).not.toBeInTheDocument();

      act(() => {
        state.overviewStyle = "charts";
      });

      expect(screen.getAllByTestId("cluster-pie-chart")).toHaveLength(3);
      expect(screen.queryByTestId("cluster-capacity-cards")).not.toBeInTheDocument();
    });
  });
});
