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
  const ONE_DAY = 86400; // 24 hours in seconds
  const FOUR_HOURS = 4 * 60 * 60;

  // For ranges <= 4 hours: 60s step (up to 240 points)
  if (rangeSeconds <= FOUR_HOURS) {
    return 60;
  }

  // For ranges <= 1 day: 10min step (up to 144 points)
  if (rangeSeconds <= ONE_DAY) {
    return 600;
  }

  // For ranges <= 4 days: 1hr step
  if (rangeSeconds <= 4 * ONE_DAY) {
    return 3600;
  }

  // For ranges <= 14 days: 3hr step
  if (rangeSeconds <= 14 * ONE_DAY) {
    return 10800;
  }

  // For ranges <= 30 days: 6hr step
  if (rangeSeconds <= 30 * ONE_DAY) {
    return 21600;
  }

  // For ranges > 30 days: 12hr step
  return 43200;
}

const requestMetricsInjectable = getInjectable({
  id: "request-metrics",
  instantiate: (di) => {
    const apiBase = di.inject(apiBaseInjectable);
    const CACHE_TTL_MS = 5000;
    const inFlightRequests = new Map<
      string,
      Promise<MetricData | MetricData[] | Partial<Record<string, MetricData>>>
    >();
    const responseCache = new Map<
      string,
      {
        timestamp: number;
        value: MetricData | MetricData[] | Partial<Record<string, MetricData>>;
      }
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
      const cachedResponse = responseCache.get(requestKey);

      if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
        return cachedResponse.value;
      }

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

      const response = await requestPromise;

      responseCache.set(requestKey, {
        timestamp: Date.now(),
        value: response,
      });

      return response;
    }

    return requestMetrics;
  },
});

export default requestMetricsInjectable;
