/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../../themes/active.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { renderFor } from "../test-utils/renderFor";
import { ContainerCharts } from "./container-charts";
import { PodCharts } from "./pod-charts";

const barChartMock = jest.fn();

jest.mock("../../../common/k8s-api/endpoints/metrics.api", () => ({
  getItemMetrics: (metrics: unknown) => metrics,
  isMetricsEmpty: () => false,
  normalizeMetrics: (metric: unknown) => metric,
}));

jest.mock("../chart", () => ({
  BarChart: (props: unknown) => {
    barChartMock(props);

    return null;
  },
}));

const metric = {
  status: "",
  data: {
    resultType: "",
    result: [{ values: [[1_710_000_000, "1"]], metric: { container: "main" } }],
  },
};

const podMetrics = {
  cpuUsage: metric,
  memoryUsage: metric,
  fsUsage: metric,
  fsWrites: metric,
  fsReads: metric,
  networkReceive: metric,
  networkTransmit: metric,
};

const containerMetrics = {
  cpuUsage: metric,
  cpuRequests: metric,
  cpuLimits: metric,
  memoryUsage: metric,
  memoryRequests: metric,
  memoryLimits: metric,
  fsUsage: metric,
  fsWrites: metric,
  fsReads: metric,
};

describe("pending range changes", () => {
  beforeEach(() => {
    barChartMock.mockReset();
  });

  it("does not keep rendering stale pod charts when a different custom range is pending", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let timeRange = { duration: null, customStart: 100, customEnd: 200 };

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => timeRange,
          },
          timestamps: {
            get: () => {
              const value = timeRange;

              return {
                start: value.customStart ?? 0,
                end: value.customEnd ?? 0,
                range: (value.customEnd ?? 0) - (value.customStart ?? 0),
              };
            },
          },
        }) as never,
    );

    const result = render(
      <ResourceMetricsContext.Provider
        value={{
          metrics: podMetrics as never,
          tab: "CPU",
          object: { getId: () => "pod-id", getName: () => "pod-name" } as never,
          isPending: false,
        }}
      >
        <PodCharts />
      </ResourceMetricsContext.Provider>,
    );

    const initialCallCount = barChartMock.mock.calls.length;

    timeRange = { duration: null, customStart: 300, customEnd: 400 };

    result.rerender(
      <ResourceMetricsContext.Provider
        value={{
          metrics: podMetrics as never,
          tab: "CPU",
          object: { getId: () => "pod-id", getName: () => "pod-name" } as never,
          isPending: true,
        }}
      >
        <PodCharts />
      </ResourceMetricsContext.Provider>,
    );

    expect(barChartMock.mock.calls.length).toBe(initialCallCount);
  });

  it("does not keep rendering stale container charts when a different custom range is pending", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let timeRange = { duration: null, customStart: 500, customEnd: 600 };

    di.override(activeThemeInjectable, () =>
      computed(
        () =>
          ({
            colors: {
              chartCapacityColor: "#123456",
            },
          }) as never,
      ),
    );
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => timeRange,
          },
          timestamps: {
            get: () => {
              const value = timeRange;

              return {
                start: value.customStart ?? 0,
                end: value.customEnd ?? 0,
                range: (value.customEnd ?? 0) - (value.customStart ?? 0),
              };
            },
          },
        }) as never,
    );

    const result = render(
      <ResourceMetricsContext.Provider
        value={{
          metrics: containerMetrics as never,
          tab: "CPU",
          object: { getId: () => "pod-id", getName: () => "pod-name" } as never,
          isPending: false,
        }}
      >
        <ContainerCharts containerName="main" />
      </ResourceMetricsContext.Provider>,
    );

    const initialCallCount = barChartMock.mock.calls.length;

    timeRange = { duration: null, customStart: 700, customEnd: 800 };

    result.rerender(
      <ResourceMetricsContext.Provider
        value={{
          metrics: containerMetrics as never,
          tab: "CPU",
          object: { getId: () => "pod-id", getName: () => "pod-name" } as never,
          isPending: true,
        }}
      >
        <ContainerCharts containerName="main" />
      </ResourceMetricsContext.Provider>,
    );

    expect(barChartMock.mock.calls.length).toBe(initialCallCount);
  });
});
