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
   * - <= 4 hours: 60s (1 minute)
   * - <= 1 day: 600s (10 minutes)
   * - <= 4 days: 3600s (1 hour)
   * - <= 14 days: 10800s (3 hours)
   * - <= 30 days: 21600s (6 hours)
   * - > 30 days: 43200s (12 hours)
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
 * The policy favors UI responsiveness for large ranges by aggressively downsampling.
 *
 * @param rangeSeconds - Time range in seconds
 * @returns Appropriate step in seconds
 */
function calculateAdaptiveStep(rangeSeconds: number): number {
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

const requestMetricsInjectable = getInjectable({
  id: "request-metrics",
  instantiate: (di) => {
    const apiBase = di.inject(apiBaseInjectable);
    const inFlightRequests = new Map<
      string,
      Promise<MetricData | MetricData[] | Partial<Record<string, MetricData>>>
    >();

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

      const requestKey = JSON.stringify({
        query,
        start,
        end,
        step,
        namespace,
      });
      const existingRequest = inFlightRequests.get(requestKey);

      if (existingRequest) {
        return existingRequest;
      }

      const requestPromise = apiBase
        .post("/metrics", {
          data: query,
          query: {
            start,
            end,
            step,
            kubernetes_namespace: namespace,
          },
        })
        .finally(() => {
          inFlightRequests.delete(requestKey);
        });

      inFlightRequests.set(requestKey, requestPromise);

      return requestPromise;
    }

    return requestMetrics;
  },
});

export default requestMetricsInjectable;
