/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { normalizeMetrics } from "./metrics.api";

import type { MetricData } from "./metrics.api";

describe("normalizeMetrics", () => {
  it("returns a safe empty shape when metrics are missing", () => {
    expect(normalizeMetrics(undefined)).toEqual({
      data: {
        resultType: "",
        result: [
          {
            metric: {},
            values: [],
          },
        ],
      },
      status: "",
    });
  });

  it("preserves historical values exactly as returned by the backend", () => {
    const metrics: MetricData = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: {
              pod: "demo-pod",
            },
            values: [
              [1_700_000_000, "1.5"],
              [1_700_000_420, "2.5"],
            ],
          },
        ],
      },
    };

    expect(normalizeMetrics(metrics)).toBe(metrics);
    expect(normalizeMetrics(metrics).data.result[0].values).toEqual([
      [1_700_000_000, "1.5"],
      [1_700_000_420, "2.5"],
    ]);
  });

  it("does not fabricate zero-filled points for single-point or coarse-step series", () => {
    const singlePoint: MetricData = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: {},
            values: [[1_700_000_000, "3"]],
          },
        ],
      },
    };
    const coarseStep: MetricData = {
      status: "success",
      data: {
        resultType: "matrix",
        result: [
          {
            metric: {},
            values: [
              [1_700_000_000, "4"],
              [1_700_003_600, "5"],
            ],
          },
        ],
      },
    };

    expect(normalizeMetrics(singlePoint).data.result[0].values).toEqual([[1_700_000_000, "3"]]);
    expect(normalizeMetrics(coarseStep).data.result[0].values).toEqual([
      [1_700_000_000, "4"],
      [1_700_003_600, "5"],
    ]);
  });
});
