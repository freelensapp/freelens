/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { Chart as ChartJS } from "chart.js";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { WorkloadStatusChart } from "./overview-workload-status";

import type { ChartTypeRegistry, TooltipItem, TooltipOptions } from "chart.js";

import type { DiRender } from "../test-utils/renderFor";
import type { WorkloadStatus } from "./overview-workload-status";

// The Chart.js chart that the ring drew on its canvas.
function chartOf(container: HTMLElement) {
  const canvas = container.querySelector("canvas");
  const chart = canvas ? ChartJS.getChart(canvas) : undefined;

  if (!chart) {
    throw new Error("The canvas has no Chart.js chart");
  }

  return chart;
}

// The values of the dataset: the grey ring of no items first, and then a value for each status.
const valuesOf = (container: HTMLElement) => chartOf(container).data.datasets[0].data;

const legendEntries = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(".OverviewWorkloadStatus-legendEntry"));

// The tooltip options as the ring gave them, not resolved by Chart.js.
const tooltipOf = (container: HTMLElement) =>
  chartOf(container).config.options?.plugins?.tooltip as Partial<TooltipOptions<keyof ChartTypeRegistry>>;

// What the tooltip gets for the value at an index of the dataset.
const tooltipItem = (container: HTMLElement, dataIndex: number) => {
  const chart = chartOf(container);
  const dataset = chart.data.datasets[0];

  return {
    chart,
    dataset,
    datasetIndex: 0,
    dataIndex,
    raw: dataset.data[dataIndex],
    parsed: dataset.data[dataIndex],
  } as unknown as TooltipItem<keyof ChartTypeRegistry>;
};

const statuses: WorkloadStatus = { running: 2, pending: 1, failed: 1 };

describe("WorkloadStatusChart", () => {
  let render: DiRender;

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
  });

  it("has a value for each status, after the grey ring of no items", () => {
    const { container } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);

    expect(valuesOf(container)).toEqual([0, 2, 1, 1]);
  });

  it.each([
    { name: "with a count of 0", next: { running: 3, pending: 0, failed: 1 } },
    { name: "out of the status object", next: { running: 3, failed: 1 } },
  ])("keeps the index of a status when a status before it is given $name", ({ next }) => {
    const { container, rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);
    const dataset = chartOf(container).data.datasets[0];

    rerender(<WorkloadStatusChart status={next} data-testid="ring" />);

    expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
    expect(valuesOf(container)).toEqual([0, 3, 0, 1]);
  });

  it("puts a status it gets for the first time after the statuses it has", () => {
    const { container, rerender } = render(<WorkloadStatusChart status={{ running: 2, failed: 1 }} />);

    rerender(<WorkloadStatusChart status={{ running: 2, pending: 1, failed: 1 }} />);

    expect(valuesOf(container)).toEqual([0, 2, 1, 1]);
    expect(legendEntries(container).map((entry) => entry.textContent)).toEqual([
      "Running: 2",
      "Failed: 1",
      "Pending: 1",
    ]);
  });

  it("turns the ring grey in the same dataset when no status has items, and back", () => {
    const { container, rerender } = render(<WorkloadStatusChart status={statuses} />);
    const dataset = chartOf(container).data.datasets[0];

    rerender(<WorkloadStatusChart status={{ running: 0 }} />);

    expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
    expect(valuesOf(container)).toEqual([1, 0, 0, 0]);

    rerender(<WorkloadStatusChart status={{ pending: 1 }} />);

    expect(chartOf(container).data.datasets[0] === dataset, "the chart has the same dataset object").toBe(true);
    expect(valuesOf(container)).toEqual([0, 0, 1, 0]);
  });

  it("draws the grey ring alone when there are no statuses", () => {
    const { container } = render(<WorkloadStatusChart status={{}} />);

    expect(valuesOf(container)).toEqual([1]);
    expect(legendEntries(container)).toEqual([]);
  });

  describe("legend", () => {
    it("lists the statuses with items, each with its count", () => {
      render(<WorkloadStatusChart status={{ ...statuses, failed: 0 }} data-testid="ring" />);

      expect(screen.getAllByTestId(/^ring-status-/).map((entry) => entry.textContent)).toEqual([
        "Running: 2",
        "Pending: 1",
      ]);
    });

    it("is the ring's own rather than the legend of `PieChart`", () => {
      render(<WorkloadStatusChart status={statuses} data-testid="ring" />);

      expect(screen.getByTestId("ring").querySelector(".legend")).toBeNull();
    });

    it("keeps the element of an entry when its count changes", () => {
      const { rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);
      const running = screen.getByTestId("ring-status-running");

      rerender(<WorkloadStatusChart status={{ ...statuses, running: 3 }} data-testid="ring" />);

      expect(screen.getByTestId("ring-status-running")).toBe(running);
      expect(running).toHaveTextContent("Running: 3");
    });

    it.each([
      { name: "reaches zero", next: { running: 2, pending: 0, failed: 1 } },
      { name: "leaves the status object", next: { running: 2, failed: 1 } },
    ])("collapses the entry of a status that $name, out of the chart and without a test id", ({ next }) => {
      const { container, rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);
      const pending = screen.getByTestId("ring-status-pending");
      const entry = legendEntries(container)[1];

      rerender(<WorkloadStatusChart status={next} data-testid="ring" />);

      expect(legendEntries(container)[1]).toBe(entry);
      expect(entry).toContainElement(pending);
      expect(entry).toHaveAttribute("data-collapsed", "true");
      expect(entry).toHaveAttribute("aria-hidden", "true");
      expect(entry).toHaveAttribute("inert");
      expect(pending).not.toHaveAttribute("data-testid");
      expect(screen.queryByTestId("ring-status-pending")).not.toBeInTheDocument();
    });

    it("shows the last count of the status in the entry while it closes", () => {
      const { container, rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);

      rerender(<WorkloadStatusChart status={{ running: 2, failed: 1 }} data-testid="ring" />);

      expect(legendEntries(container)[1]).toHaveTextContent("Pending: 1");
    });

    it("opens the same entry again when the status gets items back", () => {
      const { container, rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);
      const pending = screen.getByTestId("ring-status-pending");

      rerender(<WorkloadStatusChart status={{ running: 2, failed: 1 }} data-testid="ring" />);
      rerender(<WorkloadStatusChart status={{ ...statuses, pending: 4 }} data-testid="ring" />);

      expect(screen.getByTestId("ring-status-pending")).toBe(pending);
      expect(pending).toHaveTextContent("Pending: 4");
      expect(legendEntries(container)[1]).not.toHaveAttribute("data-collapsed");
      expect(legendEntries(container)[1]).not.toHaveAttribute("aria-hidden");
      expect(legendEntries(container)[1]).not.toHaveAttribute("inert");
    });

    it("collapses every entry when no status has items", () => {
      const { container, rerender } = render(<WorkloadStatusChart status={statuses} data-testid="ring" />);

      rerender(<WorkloadStatusChart status={{}} data-testid="ring" />);

      expect(legendEntries(container)).toHaveLength(3);
      expect(legendEntries(container).every((entry) => entry.hasAttribute("data-collapsed"))).toBe(true);
      expect(screen.queryAllByTestId(/^ring-status-/)).toEqual([]);
    });
  });

  describe("tooltip", () => {
    it("skips an arc without items", () => {
      const { container } = render(<WorkloadStatusChart status={{ ...statuses, pending: 0 }} />);
      const { filter } = tooltipOf(container);

      expect(filter?.(tooltipItem(container, 0), 0, [], {} as never)).toBe(false);
      expect(filter?.(tooltipItem(container, 1), 0, [], {} as never)).toBe(true);
      expect(filter?.(tooltipItem(container, 2), 0, [], {} as never)).toBe(false);
      expect(filter?.(tooltipItem(container, 3), 0, [], {} as never)).toBe(true);
    });

    it("names the status and its share", () => {
      const { container } = render(<WorkloadStatusChart status={statuses} />);
      const label = tooltipOf(container).callbacks?.label as unknown as (
        item: TooltipItem<keyof ChartTypeRegistry>,
      ) => string;

      expect(label(tooltipItem(container, 1))).toBe("Running: 50%");
      expect(label(tooltipItem(container, 2))).toBe("Pending: 25%");
    });

    it("names the grey ring when no status has items", () => {
      const { container } = render(<WorkloadStatusChart status={{ running: 0 }} />);
      const { filter, callbacks } = tooltipOf(container);
      const label = callbacks?.label as unknown as (item: TooltipItem<keyof ChartTypeRegistry>) => string;

      expect(filter?.(tooltipItem(container, 0), 0, [], {} as never)).toBe(true);
      expect(label(tooltipItem(container, 0))).toBe("Empty: 100%");
    });
  });

  describe("with reduced motion", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const stubReducedMotion = (matches: boolean) =>
      vi.stubGlobal(
        "matchMedia",
        vi.fn((query: string) => ({ matches: matches && query === "(prefers-reduced-motion: reduce)" })),
      );

    it("turns the animation of the ring off", () => {
      stubReducedMotion(true);

      const { container } = render(<WorkloadStatusChart status={statuses} />);

      expect(chartOf(container).config.options?.animation).toBe(false);
    });

    it("keeps the animation of the ring without it", () => {
      stubReducedMotion(false);

      const { container } = render(<WorkloadStatusChart status={statuses} />);

      expect(chartOf(container).config.options?.animation).not.toBe(false);
    });
  });
});
