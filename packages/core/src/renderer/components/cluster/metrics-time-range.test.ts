/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { validateCustomMetricsTimeRange } from "./metrics-time-range";

describe("validateCustomMetricsTimeRange", () => {
  const now = new Date("2024-01-01T12:00:00Z");

  it("rejects an empty start", () => {
    expect(validateCustomMetricsTimeRange({ start: "", end: "2024-01-01T11:00", now })).toEqual({
      error: "Start date is required",
    });
  });

  it("rejects an empty end", () => {
    expect(validateCustomMetricsTimeRange({ start: "2024-01-01T11:00", end: "", now })).toEqual({
      error: "End date is required",
    });
  });

  it("rejects an invalid start", () => {
    expect(validateCustomMetricsTimeRange({ start: "2024-99-01T11:00", end: "2024-01-01T11:30", now })).toEqual({
      error: "Start date is invalid",
    });
  });

  it("rejects an invalid end", () => {
    expect(validateCustomMetricsTimeRange({ start: "2024-01-01T11:00", end: "not-a-date", now })).toEqual({
      error: "End date is invalid",
    });
  });

  it("rejects a start that is after the end", () => {
    expect(validateCustomMetricsTimeRange({ start: "2024-01-01T11:30", end: "2024-01-01T11:00", now })).toEqual({
      error: "Start date must be before end date",
    });
  });

  it("rejects a future end", () => {
    expect(validateCustomMetricsTimeRange({ start: "2024-01-01T11:00", end: "2024-01-01T12:30", now })).toEqual({
      error: "End date cannot be in the future",
    });
  });

  it("returns integer unix seconds for a valid range", () => {
    const expectedStart = Math.floor(new Date(2024, 0, 1, 10, 15).getTime() / 1000);
    const expectedEnd = Math.floor(new Date(2024, 0, 1, 11, 45).getTime() / 1000);

    expect(
      validateCustomMetricsTimeRange({
        start: "2024-01-01T10:15",
        end: "2024-01-01T11:45",
        now,
      }),
    ).toEqual({
      value: {
        start: expectedStart,
        end: expectedEnd,
      },
    });
  });
});
