/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import moment from "moment";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../../themes/active.injectable";
import { renderFor } from "../test-utils/renderFor";
import { BarChart } from "./bar-chart";

const chartMock = jest.fn();

jest.mock("./chart", () => ({
  ChartKind: {
    BAR: "bar",
    LINE: "line",
  },
  Chart: (props: unknown) => {
    chartMock(props);

    return null;
  },
}));

describe("BarChart", () => {
  beforeEach(() => {
    chartMock.mockReset();
  });

  it("keeps the shared parser strict while formatting stringified millisecond tick values correctly", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);

    di.override(activeThemeInjectable, () =>
      computed(
        () =>
          ({
            colors: {
              textColorPrimary: "#fff",
              borderFaintColor: "#000",
              chartStripesColor: "#111",
            },
          }) as never,
      ),
    );

    render(
      <BarChart
        data={{
          datasets: [
            {
              id: "dataset-id",
              label: "Dataset",
              borderColor: "#00a7a0",
              data: [{ x: 1_710_000_000_000, y: "1" }],
            },
          ],
        }}
      />,
    );

    const options = chartMock.mock.calls[0][0].options;
    const parser = options.scales.xAxes[0].time.parser;
    const tickCallback = options.scales.xAxes[0].ticks.callback;
    const chartJsTicks = [{ value: "1710000000000", major: false }];

    expect(parser(1_710_000_000_000)).toBe(1_710_000_000_000);
    expect(parser("1710000000000")).toBeNaN();
    expect(parser("2024-01-01T00:00:00Z")).toBe(1_704_067_200_000);
    expect(tickCallback("17:00", 0, chartJsTicks)).toBe(moment(1_710_000_000_000).format("HH:mm"));
  });
});
