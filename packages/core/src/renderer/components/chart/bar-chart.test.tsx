/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../../themes/active.injectable";
import { renderFor } from "../test-utils/renderFor";
import { BarChart } from "./bar-chart";

const chartMock = vi.fn();

// Local-time formatters mirroring bar-chart.tsx so expectations stay
// deterministic regardless of the host locale (previously via moment).
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (value: number): string => String(value).padStart(2, "0");

const formatHoursMinutes = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const formatMonthDay = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${MONTHS_SHORT[date.getMonth()]} ${pad2(date.getDate())}`;
};

const formatMonthDayTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${MONTHS_SHORT[date.getMonth()]} ${pad2(date.getDate())}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

vi.mock("./chart", () => ({
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
    const parser = options.scales.x.time.parser;
    const tickCallback = options.scales.x.ticks.callback;
    const chartJsTicks = [{ value: "1710000000000", major: false }];

    expect(parser(1_710_000_000_000)).toBe(1_710_000_000_000);
    expect(parser("1710000000000")).toBeNaN();
    expect(parser("2024-01-01T00:00:00Z")).toBe(1_704_067_200_000);
    expect(tickCallback("17:00", 0, chartJsTicks)).toBe(formatHoursMinutes(1_710_000_000_000));
  });

  it("uses day-sized x-axis ticks for large custom ranges", () => {
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
        minTime={1_704_067_200}
        maxTime={1_704_931_200}
        data={{
          datasets: [
            {
              id: "dataset-id",
              label: "Dataset",
              borderColor: "#00a7a0",
              data: [
                { x: 1_704_067_200_000, y: "1" },
                { x: 1_704_499_200_000, y: "2" },
                { x: 1_704_931_200_000, y: "3" },
              ],
            },
          ],
        }}
      />,
    );

    const options = chartMock.mock.calls[0][0].options;
    const tickCallback = options.scales.x.ticks.callback;
    const chartJsTicks = [
      { value: "1704067200000", major: false },
      { value: "1704499200000", major: false },
      { value: "1704931200000", major: false },
    ];

    expect(options.scales.x.time.unit).toBe("day");
    expect(tickCallback("1704067200000", 0, chartJsTicks)).toBe(formatMonthDay(1_704_067_200_000));
    expect(tickCallback("1704499200000", 1, chartJsTicks)).toBe(formatMonthDay(1_704_499_200_000));
    expect(tickCallback("1704931200000", 2, chartJsTicks)).toBe(formatMonthDay(1_704_931_200_000));
  });

  it("formats tooltip titles as readable dates and skips future timestamps", () => {
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
    const tooltipTitle = options.plugins.tooltip.callbacks.title;

    expect(tooltipTitle([{ parsed: { x: "1710000000000" } }])).toBe(formatMonthDayTime(1_710_000_000_000));
    expect(tooltipTitle([{ parsed: { x: 1_710_000_000_000 } }])).toBe(formatMonthDayTime(1_710_000_000_000));
    expect(tooltipTitle([{ parsed: { x: "9999999999999" } }])).toBe("");
    expect(tooltipTitle([])).toBe("");
  });
});
