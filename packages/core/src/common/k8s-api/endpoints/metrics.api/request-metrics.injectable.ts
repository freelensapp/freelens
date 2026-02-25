/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { getSecondsFromUnixEpoch } from "../../../utils/date/get-current-date-time";
import apiBaseInjectable from "../../api-base.injectable";

import type { MetricData } from "../metrics.api";

export interface RequestMetricsParams {
  /**
   * timestamp in seconds or valid date-string
   */
  start?: number | string;

  /**
   * timestamp in seconds or valid date-string
   */
  end?: number | string;

  /**
   * step in seconds
   * When not provided, automatically calculated based on time range:
   * - <= 1 day: 60s (1 minute)
   * - <= 7 days: 300s (5 minutes)
   * - <= 30 days: 900s (15 minutes)
   * - <= 90 days: 3600s (1 hour)
   * - > 90 days: 21600s (6 hours)
   */
  step?: number;

  /**
   * time-range in seconds for data aggregation
   * @default 3600 (1 hour)
   */
  range?: number;

  /**
   * rbac-proxy validation param
   */
  namespace?: string;
}

export type RequestMetrics = ReturnType<(typeof requestMetricsInjectable)["instantiate"]>;

/**
 * Calculate adaptive step based on time range to avoid excessive data points.
 * Aims to keep data points between 500-1500 for optimal performance.
 *
 * @param rangeSeconds - Time range in seconds
 * @returns Appropriate step in seconds
 */
function calculateAdaptiveStep(rangeSeconds: number): number {
  const ONE_DAY = 86400; // 24 hours in seconds

  // For ranges <= 1 day: 60s step (up to 1,440 points)
  if (rangeSeconds <= ONE_DAY) {
    return 60;
  }

  // For ranges > 1 day and <= 7 days: 5min step (up to ~2,016 points for 7 days)
  if (rangeSeconds <= 7 * ONE_DAY) {
    return 300;
  }

  // For ranges > 7 days and <= 30 days: 15min step (up to ~2,880 points for 30 days)
  if (rangeSeconds <= 30 * ONE_DAY) {
    return 900;
  }

  // For ranges > 30 days and <= 90 days: 1hr step (up to ~2,160 points for 90 days)
  if (rangeSeconds <= 90 * ONE_DAY) {
    return 3600;
  }

  // For ranges > 90 days: 6hr step
  return 21600;
}

const requestMetricsInjectable = getInjectable({
  id: "request-metrics",
  instantiate: (di) => {
    const apiBase = di.inject(apiBaseInjectable);

    function requestMetrics(query: string, params?: RequestMetricsParams): Promise<MetricData>;
    function requestMetrics(query: string[], params?: RequestMetricsParams): Promise<MetricData[]>;
    function requestMetrics<Keys extends string>(
      query: Record<Keys, Partial<Record<string, string>>>,
      params?: RequestMetricsParams,
    ): Promise<Record<Keys, MetricData>>;
    async function requestMetrics(
      query: string | string[] | Partial<Record<string, Partial<Record<string, string>>>>,
      params: RequestMetricsParams = {},
    ): Promise<MetricData | MetricData[] | Partial<Record<string, MetricData>>> {
      const { range = 3600, namespace } = params;
      let { start, end, step } = params;

      if (!start && !end) {
        const now = getSecondsFromUnixEpoch();

        start = now - range;
        end = now;
      }

      // Calculate actual range in seconds
      const actualRange = typeof end === "number" && typeof start === "number" ? end - start : range;

      // Use adaptive step if not explicitly provided
      if (step === undefined) {
        step = calculateAdaptiveStep(actualRange);
      }

      return apiBase.post("/metrics", {
        data: query,
        query: {
          start,
          end,
          step,
          kubernetes_namespace: namespace,
        },
      });
    }

    return requestMetrics;
  },
});

export default requestMetricsInjectable;
