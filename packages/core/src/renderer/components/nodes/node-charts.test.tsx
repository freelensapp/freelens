/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../../themes/active.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { renderFor } from "../test-utils/renderFor";
import { NodeCharts } from "./node-charts";

const barChartMock = vi.fn();

vi.mock("../../../common/k8s-api/endpoints/metrics.api", () => ({
  isMetricsEmpty: () => false,
  normalizeMetrics: (metric: unknown) => metric,
}));

vi.mock("../chart", () => ({
  BarChart: (props: unknown) => {
    barChartMock(props);

    return null;
  },
}));

const metric = {
  status: "",
  data: {
    resultType: "",
    result: [{ values: [[1_710_000_000, "1"]] }],
  },
};

const metrics = {
  memoryUsage: metric,
  workloadMemoryUsage: metric,
  memoryRequests: metric,
  memoryCapacity: metric,
  memoryAllocatableCapacity: metric,
  cpuUsage: metric,
  cpuRequests: metric,
  cpuCapacity: metric,
  cpuAllocatableCapacity: metric,
  podUsage: metric,
  podCapacity: metric,
  fsSize: metric,
  fsUsage: metric,
};

describe("NodeCharts", () => {
  beforeEach(() => {
    barChartMock.mockReset();
  });

  it("passes selected time-range bounds to BarChart", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

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
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 100, end: 200, range: 100 }),
      },
    }));

    render(
      <ResourceMetricsContext.Provider
        value={{
          metrics: metrics as never,
          tab: "CPU",
          object: { getId: () => "node-id", getName: () => "node-name" } as never,
          isPending: false,
        }}
      >
        <NodeCharts />
      </ResourceMetricsContext.Provider>,
    );

    expect(barChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        minTime: 100,
        maxTime: 200,
      }),
    );

    const barChartProps = barChartMock.mock.calls[0][0];
    const firstDatasetPoint = barChartProps.data.datasets[0].data[0];

    expect(firstDatasetPoint.x).toBe(1_710_000_000_000);
  });
});
