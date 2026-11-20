/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { render } from "@testing-library/react";
import { Chart as ChartJS } from "chart.js";
import { describe, expect, it } from "vitest";
import { Chart } from "./chart";

import type { ChartData } from "./chart";

// The data of a status ring of the workloads overview: one dataset without an
// id, one value for each status.
const statuses = (values: number[], colors = ["green", "orange", "red"]): ChartData => ({
  datasets: [{ label: "Status", data: values, backgroundColor: colors.slice(0, values.length) }],
});

// The data of a chart with a dataset for each id, as the metric charts have.
const series = (ids: string[]): ChartData => ({
  datasets: ids.map((id) => ({ id, label: id, data: [1, 2] })),
});

// The Chart.js chart that the component drew on its canvas. The tests read
// from it what Chart.js itself keeps for a dataset: its controller and its
// elements, which is what an update animates from.
function chartOf(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  const chart = canvas ? ChartJS.getChart(canvas) : undefined;

  if (!chart) {
    throw new Error("The canvas has no Chart.js chart");
  }

  return chart;
}

describe("Chart", () => {
  it("keeps the controller and the elements of a dataset when the same values come again", () => {
    const { container, rerender } = render(<Chart data={statuses([3, 1])} showLegend={false} />);
    const chart = chartOf(container);
    const dataset = chart.data.datasets[0];
    const { controller } = chart.getDatasetMeta(0);
    const elements = [...chart.getDatasetMeta(0).data];

    rerender(<Chart data={statuses([3, 1])} showLegend={false} />);

    expect(chart.data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
    expect(chart.getDatasetMeta(0).controller === controller, "the dataset has the same controller").toBe(true);
    expect(chart.getDatasetMeta(0).data).toHaveLength(2);
    expect(
      chart.getDatasetMeta(0).data.every((element, index) => element === elements[index]),
      "the dataset has the same elements",
    ).toBe(true);
  });

  it("puts the new values and the new fields of a dataset into the object the chart has", () => {
    const { container, rerender } = render(<Chart data={statuses([3, 1])} showLegend={false} />);
    const chart = chartOf(container);
    const dataset = chart.data.datasets[0];
    const { controller } = chart.getDatasetMeta(0);

    rerender(<Chart data={statuses([2, 2], ["green", "red"])} showLegend={false} />);

    expect(chart.data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
    expect(chart.data.datasets[0].data).toEqual([2, 2]);
    expect(chart.data.datasets[0].backgroundColor).toEqual(["green", "red"]);
    expect(chart.getDatasetMeta(0).controller === controller, "the dataset has the same controller").toBe(true);
  });

  it("drops the fields that the new data of a dataset does not have", () => {
    // A ring of the workloads overview with a status, and then with no object left.
    const withStatus: ChartData = {
      datasets: [{ label: "Status", data: [1], backgroundColor: ["green"], tooltipLabels: [() => "Succeeded: 100%"] }],
    };
    const empty: ChartData = { datasets: [{ label: "Empty", data: [1], backgroundColor: ["grey"] }] };
    const { container, rerender } = render(<Chart data={withStatus} showLegend={false} />);
    const chart = chartOf(container);

    rerender(<Chart data={empty} showLegend={false} />);

    expect(Object.keys(chart.data.datasets[0]).sort()).toEqual(["backgroundColor", "data", "label"]);
    expect(chart.data.datasets[0]).toEqual({ label: "Empty", data: [1], backgroundColor: ["grey"] });
  });

  it("keeps the elements that stay when a dataset gets one value more", () => {
    const { container, rerender } = render(<Chart data={statuses([3])} showLegend={false} />);
    const chart = chartOf(container);
    const [element] = chart.getDatasetMeta(0).data;

    rerender(<Chart data={statuses([3, 1])} showLegend={false} />);

    expect(chart.getDatasetMeta(0).data).toHaveLength(2);
    expect(chart.getDatasetMeta(0).data[0] === element, "the first element is the same one").toBe(true);
  });

  it("does not change the data that the caller passed", () => {
    const first = statuses([3, 1]);
    const { rerender } = render(<Chart data={first} showLegend={false} />);

    rerender(<Chart data={statuses([2, 2], ["green", "red"])} showLegend={false} />);

    expect(first).toEqual(statuses([3, 1]));
  });

  it("keeps the dataset that stays when another one goes away", () => {
    const { container, rerender } = render(<Chart data={series(["cpu", "memory"])} showLegend={false} />);
    const chart = chartOf(container);
    const memory = chart.data.datasets[1];
    const { controller } = chart.getDatasetMeta(1);

    rerender(<Chart data={series(["memory"])} showLegend={false} />);

    expect(chart.data.datasets).toHaveLength(1);
    expect(chart.data.datasets[0] === memory, "the chart has the same dataset object").toBe(true);
    expect(chart.getDatasetMeta(0).controller === controller, "the dataset has the same controller").toBe(true);
  });

  it("keeps the dataset that is there when another one comes", () => {
    const { container, rerender } = render(<Chart data={series(["cpu"])} showLegend={false} />);
    const chart = chartOf(container);
    const cpu = chart.data.datasets[0];
    const { controller } = chart.getDatasetMeta(0);

    rerender(<Chart data={series(["cpu", "memory"])} showLegend={false} />);

    expect(chart.data.datasets).toHaveLength(2);
    expect(chart.data.datasets[0] === cpu, "the chart has the same dataset object").toBe(true);
    expect(chart.getDatasetMeta(0).controller === controller, "the dataset has the same controller").toBe(true);
    expect(chart.getDatasetMeta(1).controller, "the new dataset has a controller").toBeTruthy();
  });
});
