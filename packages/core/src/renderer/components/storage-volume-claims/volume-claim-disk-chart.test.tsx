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
import { VolumeClaimDiskChart } from "./volume-claim-disk-chart";

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
  memoryOptions: {},
}));

const metric = {
  status: "",
  data: {
    resultType: "",
    result: [{ values: [[1_710_000_000, "1"]] }],
  },
};

describe("VolumeClaimDiskChart", () => {
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
        get: () => ({ start: 50, end: 110, range: 60 }),
      },
    }));

    render(
      <ResourceMetricsContext.Provider
        value={{
          metrics: { diskUsage: metric, diskCapacity: metric } as never,
          tab: "Disk",
          object: { getId: () => "pvc-id", getName: () => "pvc-name" } as never,
          isPending: false,
        }}
      >
        <VolumeClaimDiskChart />
      </ResourceMetricsContext.Provider>,
    );

    expect(barChartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        minTime: 50,
        maxTime: 110,
      }),
    );

    const barChartProps = barChartMock.mock.calls[0][0];
    const firstDatasetPoint = barChartProps.data.datasets[0].data[0];

    expect(firstDatasetPoint.x).toBe(1_710_000_000_000);
  });
});
