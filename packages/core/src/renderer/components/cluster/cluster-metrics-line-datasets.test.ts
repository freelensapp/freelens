/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { getClusterMetricsLineDatasets } from "./cluster-metrics-line-datasets";

const data = [
  { x: 2000, y: "0.5" },
  { x: 3000, y: "0.7" },
];

describe("getClusterMetricsLineDatasets", () => {
  it("draws the metric as a smooth filled line without points", () => {
    const [usage] = getClusterMetricsLineDatasets({
      id: "cpuworker",
      label: "CPU usage",
      color: "#00a7a0",
      data,
      references: [],
    });

    expect(usage).toMatchObject({
      id: "cpuworker",
      label: "CPU usage",
      type: "line",
      data,
      borderColor: "#00a7a0",
      fill: true,
      stepped: false,
      tension: 0.3,
      pointRadius: 0,
    });
    expect(usage.backgroundColor).toBe("rgba(0, 167, 160, 0.12)");
  });

  it("adds a dashed line across the visible range for every known reference", () => {
    const [, requests, allocatable] = getClusterMetricsLineDatasets({
      id: "cpuworker",
      label: "CPU usage",
      color: "#00a7a0",
      data,
      references: [
        { name: "Requests", value: 1.5, color: "#00a7a0" },
        { name: "Allocatable", value: 4, color: "#ffffff" },
      ],
      fromX: 1000,
      toX: 4000,
    });

    expect(requests).toMatchObject({
      id: "cpuworker-requests",
      label: "Requests",
      type: "line",
      borderColor: "#00a7a0",
      borderDash: [5, 4],
      fill: false,
      pointRadius: 0,
      data: [
        { x: 1000, y: 1.5 },
        { x: 4000, y: 1.5 },
      ],
    });
    expect(allocatable).toMatchObject({
      id: "cpuworker-allocatable",
      label: "Allocatable",
      borderColor: "#ffffff",
      data: [
        { x: 1000, y: 4 },
        { x: 4000, y: 4 },
      ],
    });
  });

  it("spans the data without a visible range", () => {
    const [, requests] = getClusterMetricsLineDatasets({
      id: "memoryworker",
      label: "MEMORY usage",
      color: "#c93dce",
      data,
      references: [{ name: "Requests", value: 2, color: "#c93dce" }],
    });

    expect(requests.data).toEqual([
      { x: 2000, y: 2 },
      { x: 3000, y: 2 },
    ]);
  });

  it("leaves out a reference without a value, and every reference without data", () => {
    const references = [
      { name: "Requests", value: undefined, color: "#00a7a0" },
      { name: "Allocatable", value: Number.NaN, color: "#ffffff" },
    ];

    expect(
      getClusterMetricsLineDatasets({ id: "a", label: "A", color: "#00a7a0", data, references }).map(({ id }) => id),
    ).toEqual(["a"]);
    expect(
      getClusterMetricsLineDatasets({
        id: "a",
        label: "A",
        color: "#00a7a0",
        data: [],
        references: [{ name: "Requests", value: 1, color: "#00a7a0" }],
      }).map(({ id }) => id),
    ).toEqual(["a"]);
  });
});
