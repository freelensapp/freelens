/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Calculate adaptive step based on time range to avoid excessive data points.
 * The policy favors UI responsiveness for large ranges by aggressively downsampling.
 *
 * @param rangeSeconds - Time range in seconds
 * @returns Appropriate step in seconds
 */
export function calculateAdaptiveStep(rangeSeconds: number): number {
  const HOUR = 3_600;
  const DAY = 24 * HOUR;

  // Keep point count bounded as time range grows.
  if (rangeSeconds <= 4 * HOUR) return 60; // 1m  (max ~240 pts)
  if (rangeSeconds <= DAY) return 10 * 60; // 10m (max ~144 pts)
  if (rangeSeconds <= 4 * DAY) return HOUR; // 1h
  if (rangeSeconds <= 14 * DAY) return 3 * HOUR; // 3h
  if (rangeSeconds <= 30 * DAY) return 6 * HOUR; // 6h

  return 12 * HOUR; // > 30d
}
