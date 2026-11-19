/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject } from "@freelensapp/utilities";

interface TimePoint {
  x: number;
  y: number | string | null;
}

const isTimePoint = (point: unknown): point is TimePoint =>
  isObject(point) && "x" in point && typeof point.x === "number" && Number.isFinite(point.x);

/**
 * Returns the sampling step (in milliseconds) of the given datasets: the
 * smallest distance between two consecutive samples. Prometheus range queries
 * return samples on a fixed `start + n * step` grid, so this is the query step
 * unless every single sample is isolated by a gap.
 */
export const getSampleStepMs = (datasets: ReadonlyArray<{ data?: unknown[] }>): number | undefined => {
  let step: number | undefined;

  for (const { data = [] } of datasets) {
    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1];
      const current = data[i];

      if (!isTimePoint(previous) || !isTimePoint(current)) {
        continue;
      }

      const distance = current.x - previous.x;

      if (distance > 0 && (step === undefined || distance < step)) {
        step = distance;
      }
    }
  }

  return step;
};

// A missing sample on the step grid makes two neighbours 2 steps apart, so
// anything above 1.5 steps means at least one evaluation had no data.
const GAP_THRESHOLD_IN_STEPS = 1.5;

/**
 * Inserts a `null` point after each sample that is followed by a gap, so that
 * Chart.js breaks the line (and its filled area) instead of joining samples
 * across periods without data, the same way Grafana shows them.
 *
 * With `holdValue` (stepped lines) the sample is first held for one step, as
 * stepped lines do between contiguous samples; otherwise a sample isolated by
 * gaps on both sides would not be drawn at all. For the same reason the last
 * sample is held for one step when it follows a gap. When holding it forward
 * would end past `maxX`, the end of the axis, the step before it is drawn
 * instead: a sample at the very end of the range (the first one after the
 * cluster comes back, or the last one of a custom range) would otherwise fall
 * entirely outside the chart.
 */
export const insertGapsInTimeSeries = <T>(
  data: T[],
  stepMs: number | undefined,
  holdValue = false,
  maxX?: number,
): Array<T | TimePoint> => {
  if (!stepMs || data.length < 2) {
    return data;
  }

  const result: Array<T | TimePoint> = [];

  data.forEach((point, index) => {
    result.push(point);

    const next = data[index + 1];

    if (isTimePoint(point) && isTimePoint(next) && next.x - point.x > stepMs * GAP_THRESHOLD_IN_STEPS) {
      if (holdValue) {
        result.push({ x: point.x + stepMs, y: point.y });
      }

      result.push({ x: point.x + stepMs, y: null });
    }
  });

  const last = data[data.length - 1];
  const beforeLast = data[data.length - 2];

  if (
    holdValue &&
    isTimePoint(last) &&
    isTimePoint(beforeLast) &&
    last.x - beforeLast.x > stepMs * GAP_THRESHOLD_IN_STEPS
  ) {
    if (maxX === undefined || last.x + stepMs <= maxX) {
      result.push({ x: last.x + stepMs, y: last.y });
    } else {
      // Never reach back before the null point that ends the previous sample.
      const holdStart = Math.max(last.x - stepMs, beforeLast.x + stepMs);

      result.splice(result.length - 1, 0, { x: holdStart, y: last.y });
    }
  }

  return result;
};
