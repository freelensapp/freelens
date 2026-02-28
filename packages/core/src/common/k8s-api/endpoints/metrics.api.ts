/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// Metrics api

import { isDefined, object } from "@freelensapp/utilities";
import moment from "moment";

export interface MetricData {
  status: string;
  data: {
    resultType: string;
    result: MetricResult[];
  };
}

export interface MetricResult {
  metric: {
    [name: string]: string | undefined;
    instance?: string;
    node?: string;
    pod?: string;
    kubernetes?: string;
    kubernetes_node?: string;
    kubernetes_namespace?: string;
  };
  values: [number, string][];
}

export function normalizeMetrics(metrics: MetricData | undefined | null, frames = 60): MetricData {
  if (!metrics?.data?.result) {
    return {
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
    };
  }

  const { result } = metrics.data;

  if (result.length) {
    if (frames > 0) {
      // fill the gaps
      result.forEach((res) => {
        if (!res.values || !res.values.length) return;

        const estimatedStepSeconds = res.values.length > 1 ? Math.max(res.values[1][0] - res.values[0][0], 0) : 60;

        // Minute-level gap filling is only valid for minute-resolution series.
        // For coarse steps (hourly+), filling each minute causes huge arrays and severe UI lag.
        if (estimatedStepSeconds > 60) {
          return;
        }

        const timestamps = new Set(res.values.map(([valueTimestamp]) => valueTimestamp));

        let now = moment().startOf("minute").subtract(1, "minute").unix();
        let timestamp = res.values[0][0];

        while (timestamp <= now) {
          timestamp = moment.unix(timestamp).add(1, "minute").unix();

          if (!timestamps.has(timestamp)) {
            res.values.push([timestamp, "0"]);
            timestamps.add(timestamp);
          }
        }

        while (res.values.length < frames) {
          const timestamp = moment.unix(res.values[0][0]).subtract(1, "minute").unix();

          if (!timestamps.has(timestamp)) {
            res.values.unshift([timestamp, "0"]);
            timestamps.add(timestamp);
          }
          now = timestamp;
        }
      });
    }
  } else {
    // always return at least empty values array
    result.push({
      metric: {},
      values: [],
    } as MetricResult);
  }

  return metrics;
}

export function isMetricsEmpty(metrics: Partial<Record<string, MetricData>>) {
  return Object.values(metrics).every((metric) => !metric?.data?.result?.length);
}

export function getItemMetrics<Keys extends string>(
  metrics: Partial<Record<Keys, MetricData>> | null | undefined,
  itemName: string,
): Partial<Record<Keys, MetricData>> | undefined {
  if (!metrics) {
    return undefined;
  }

  const itemMetrics = { ...metrics };

  for (const metric in metrics) {
    if (!metrics[metric]?.data?.result) {
      continue;
    }
    const results = metrics[metric]?.data.result;
    const result = results?.find((res) => Object.values(res.metric)[0] == itemName);

    itemMetrics[metric]!.data.result = result ? [result] : [];
  }

  return itemMetrics;
}

export function getMetricLastPoints<Keys extends string>(
  metrics: Partial<Record<Keys, MetricData>>,
): Partial<Record<Keys, number>> {
  return object.fromEntries(
    object
      .entries(metrics)
      .map(([metricName, metric]) => {
        try {
          return [metricName, +metric.data.result[0].values.slice(-1)[0][1]] as const;
        } catch {
          return undefined;
        }
      })
      .filter(isDefined),
  );
}
