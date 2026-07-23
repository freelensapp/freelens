/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { _adapters } from "chart.js";

import "./chartjs-adapter-native";

// The native adapter registers itself on import via `_adapters._date.override`.
const adapter = new _adapters._date({});

describe("chartjs-adapter-native", () => {
  it("parses numbers, dates and strings, rejecting invalid input", () => {
    expect(adapter.parse(1_704_067_200_000)).toBe(1_704_067_200_000);
    expect(adapter.parse(new Date(1_704_067_200_000))).toBe(1_704_067_200_000);
    expect(adapter.parse("2024-01-01T00:00:00Z")).toBe(1_704_067_200_000);
    expect(adapter.parse("not a date")).toBeNull();
    expect(adapter.parse(null)).toBeNull();
  });

  it("returns the raw millisecond value for the 'x' display format", () => {
    expect(adapter.format(1_704_067_200_000, "x")).toBe("1704067200000");
  });

  it("adds time units", () => {
    const base = new Date("2024-01-01T00:00:00Z").getTime();

    expect(adapter.add(base, 1, "hour")).toBe(base + 3_600_000);
    expect(adapter.add(base, 2, "day")).toBe(base + 2 * 86_400_000);
    expect(new Date(adapter.add(base, 1, "month")).toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(new Date(adapter.add(base, 1, "year")).toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("computes whole-unit differences", () => {
    const min = new Date("2024-01-01T00:00:00Z").getTime();
    const max = new Date("2024-01-03T12:00:00Z").getTime();

    expect(adapter.diff(max, min, "day")).toBe(2);
    expect(adapter.diff(max, min, "hour")).toBe(60);
    expect(adapter.diff(new Date("2024-04-01T00:00:00Z").getTime(), min, "month")).toBe(3);
  });

  it("truncates to the start of a unit", () => {
    const time = new Date("2024-03-09T13:45:30.500Z").getTime();

    expect(new Date(adapter.startOf(time, "hour")).toISOString()).toBe("2024-03-09T13:00:00.000Z");
    expect(new Date(adapter.startOf(time, "day")).toISOString()).toBe("2024-03-09T00:00:00.000Z");
    expect(new Date(adapter.startOf(time, "month")).toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(new Date(adapter.startOf(time, "year")).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("extends to the end of a unit", () => {
    const time = new Date("2024-03-09T13:45:30.500Z").getTime();

    expect(new Date(adapter.endOf(time, "hour")).toISOString()).toBe("2024-03-09T13:59:59.999Z");
    expect(new Date(adapter.endOf(time, "day")).toISOString()).toBe("2024-03-09T23:59:59.999Z");
    expect(new Date(adapter.endOf(time, "month")).toISOString()).toBe("2024-03-31T23:59:59.999Z");
  });
});
