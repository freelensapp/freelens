/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import { computed, observable } from "mobx";
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
});
