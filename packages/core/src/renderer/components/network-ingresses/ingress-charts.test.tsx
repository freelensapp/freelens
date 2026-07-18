/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { ResourceMetricsContext } from "../resource-metrics";
import { renderFor } from "../test-utils/renderFor";
import { IngressCharts } from "./ingress-charts";

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
  bytesSentSuccess: metric,
  bytesSentFailure: metric,
  requestDurationSeconds: metric,
  responseDurationSeconds: metric,
};

describe("IngressCharts", () => {
  beforeEach(() => {
    barChartMock.mockReset();
  });

  it("passes selected time-range bounds to BarChart", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 300, end: 900, range: 600 }),
      },
    }));

    render(
      <ResourceMetricsContext.Provider
        value={{
          metrics: metrics as never,
          tab: "Network",
          object: { getId: () => "ingress-id", getName: () => "ingress-name" } as never,
          isPending: false,
        }}
      >
        <IngressCharts />
      </ResourceMetricsContext.Provider>,
    );

    expect(barChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        minTime: 300,
        maxTime: 900,
      }),
    );

    const barChartProps = barChartMock.mock.calls[0][0];
    const firstDatasetPoint = barChartProps.data.datasets[0].data[0];

    expect(firstDatasetPoint.x).toBe(1_710_000_000_000);
  });
});
