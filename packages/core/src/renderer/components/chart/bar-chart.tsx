/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { bytesToUnits, cssNames, isObject } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import Color from "color";
import { merge } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { calculateAdaptiveStep } from "../../../common/k8s-api/endpoints/metrics.api/adaptive-step";
import activeThemeInjectable from "../../themes/active.injectable";
import { NoMetrics } from "../resource-metrics/no-metrics";
import { Chart, ChartKind } from "./chart";
import { ZebraStripesPlugin } from "./zebra-stripes.plugin";

import type { ChartOptions, ScriptableContext, TooltipItem } from "chart.js";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { ChartProps } from "./chart";

export interface BarChartProps extends ChartProps {
  name?: string;
  minTime?: number; // Minimum timestamp (unix seconds) for x-axis
  maxTime?: number; // Maximum timestamp (unix seconds) for x-axis
}

const getBarColor = ({ dataset }: ScriptableContext<"bar" | "line">): string =>
  Color(dataset?.borderColor).alpha(0.2).string();

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;
const FOUR_DAYS_SECONDS = 4 * ONE_DAY_SECONDS;

type BarChartTimeUnit = "minute" | "hour" | "day";

const getBarChartTimeUnit = (timeRangeSeconds: number): BarChartTimeUnit => {
  if (timeRangeSeconds <= ONE_DAY_SECONDS) {
    return "minute";
  }

  if (timeRangeSeconds < FOUR_DAYS_SECONDS) {
    return "hour";
  }

  return "day";
};

const parseBarChartTimestamp = (timestamp: string | number): number => {
  if (typeof timestamp === "number") {
    return timestamp;
  }

  return Date.parse(timestamp);
};

// Fixed English month abbreviations and zero-padded parts so the output is
// deterministic (independent of the host locale), matching moment's default
// "en" formatting that this chart relied on. All values use local time.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad2 = (value: number): string => String(value).padStart(2, "0");

interface BarChartDateParts {
  year: number;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  monthShort: string;
}

const getBarChartDateParts = (timestamp: number): BarChartDateParts => {
  const date = new Date(timestamp);

  return {
    year: date.getFullYear(),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
    hours: pad2(date.getHours()),
    minutes: pad2(date.getMinutes()),
    monthShort: MONTHS_SHORT[date.getMonth()],
  };
};

// Equivalent to moment(timestamp).format("MMM DD, HH:mm").
const formatTooltipTimestamp = (timestamp: number): string => {
  const { monthShort, day, hours, minutes } = getBarChartDateParts(timestamp);

  return `${monthShort} ${day}, ${hours}:${minutes}`;
};

const getTimeBucketAndLabel = (timestamp: string | number, timeRangeSeconds: number) => {
  const { year, month, day, hours, minutes, monthShort } = getBarChartDateParts(parseBarChartTimestamp(timestamp));
  const timeUnit = getBarChartTimeUnit(timeRangeSeconds);

  if (timeUnit === "minute") {
    return {
      bucket: `${year}-${month}-${day} ${hours}:${minutes}`,
      label: `${hours}:${minutes}`,
    };
  }

  if (timeUnit === "hour") {
    return {
      bucket: `${year}-${month}-${day} ${hours}`,
      label: `${day}, ${hours}:${minutes}`,
    };
  }

  return {
    bucket: `${year}-${month}-${day}`,
    label: `${monthShort} ${day}`,
  };
};

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
const getSampleStepMs = (datasets: ReadonlyArray<{ data?: unknown[] }>): number | undefined => {
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
 * gaps on both sides would not be drawn at all.
 */
export const insertGapsInTimeSeries = <T,>(
  data: T[],
  stepMs: number | undefined,
  holdValue = false,
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

  return result;
};

const getBarChartTickTimestamp = (tick: string | number | { value: string | number }) => {
  const rawValue = isObject(tick) && "value" in tick ? tick.value : tick;

  if (typeof rawValue === "string" && /^\d+$/.test(rawValue)) {
    return Number(rawValue);
  }

  return rawValue;
};

const NonInjectedBarChart = observer(
  ({
    activeTheme,
    name,
    data,
    className,
    minTime,
    maxTime,
    plugins,
    options: customOptions,
    ...settings
  }: Dependencies & BarChartProps) => {
    const { textColorPrimary, borderFaintColor, chartStripesColor } = activeTheme.get().colors;
    const { datasets: rawDatasets = [], ...rest } = data;
    const timeRangeSeconds = maxTime && minTime ? maxTime - minTime : 3600;
    const timeUnit = getBarChartTimeUnit(timeRangeSeconds);
    // The smallest distance between samples is the query step, except when every
    // sample is isolated by a gap (e.g. a few minutes of data in a long range):
    // then it is much larger, so cap it with the step used to query this range.
    const rangeStepMs =
      maxTime && minTime && maxTime > minTime ? calculateAdaptiveStep(timeRangeSeconds) * 1000 : undefined;
    const minSampleDistanceMs = getSampleStepMs(rawDatasets);
    const sampleStepMs =
      minSampleDistanceMs !== undefined && rangeStepMs !== undefined
        ? Math.min(minSampleDistanceMs, rangeStepMs)
        : minSampleDistanceMs;
    const inferredStepSeconds = sampleStepMs
      ? Math.max(Math.floor(sampleStepMs / 1000), 1)
      : rawDatasets[0]?.data?.length
        ? Math.max(Math.floor(timeRangeSeconds / rawDatasets[0].data.length), 1)
        : 60;
    const useSteppedStyle = inferredStepSeconds >= ONE_HOUR_SECONDS || timeRangeSeconds >= ONE_DAY_SECONDS;

    const datasets = rawDatasets
      .filter((set) => set.data?.length)
      .map((item) => ({
        type: useSteppedStyle ? ChartKind.LINE : ChartKind.BAR,
        borderWidth: useSteppedStyle ? 2 : { top: 3 },
        barPercentage: useSteppedStyle ? undefined : 1,
        categoryPercentage: useSteppedStyle ? undefined : 1,
        stepped: useSteppedStyle,
        tension: useSteppedStyle ? 0 : undefined,
        pointRadius: useSteppedStyle ? 0 : undefined,
        pointHoverRadius: useSteppedStyle ? 2 : undefined,
        fill: useSteppedStyle,
        backgroundColor: useSteppedStyle ? getBarColor({ dataset: item } as never) : undefined,
        ...item,
        data: insertGapsInTimeSeries(item.data ?? [], sampleStepMs, useSteppedStyle),
      }));

    plugins ??= [
      new ZebraStripesPlugin({
        stripeColor: chartStripesColor,
        interval: datasets[0]?.data?.length,
      }),
    ];

    if (datasets.length === 0) {
      return <NoMetrics />;
    }

    const ONE_WEEK = 7 * ONE_DAY_SECONDS;
    const maxTimeTicks = (() => {
      if (timeRangeSeconds <= 4 * 60 * 60) {
        return 6;
      }

      if (timeRangeSeconds <= ONE_DAY_SECONDS) {
        return 7;
      }

      if (timeRangeSeconds <= ONE_WEEK) {
        return 4;
      }

      return 3;
    })();

    const formatTimeLabels = (
      timestamp: string | number,
      index?: number,
      values?: Array<string | number | { value: string | number }>,
    ) => {
      const currentTimestamp = values?.[index ?? 0] ? getBarChartTickTimestamp(values[index ?? 0]) : timestamp;
      const { bucket, label } = getTimeBucketAndLabel(currentTimestamp, timeRangeSeconds);

      if (typeof index !== "number" || !values || index === 0) {
        return label;
      }

      const previousTimestamp = getBarChartTickTimestamp(values[index - 1]);
      const { bucket: previousBucket } = getTimeBucketAndLabel(previousTimestamp, timeRangeSeconds);

      return previousBucket === bucket ? "" : label;
    };

    const requestedMin = minTime ? minTime * 1000 : undefined;
    const requestedMax = maxTime ? maxTime * 1000 : undefined;

    const barOptions: ChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        x: {
          type: "time",
          offset: false,
          grid: {
            display: false,
          },
          stacked: true,
          min: requestedMin,
          max: requestedMax,
          bounds: "data",
          ticks: {
            callback: formatTimeLabels,
            autoSkip: true,
            autoSkipPadding: 12,
            maxTicksLimit: maxTimeTicks,
            source: "auto",
            color: textColorPrimary,
            font: {
              size: 11,
            },
            maxRotation: 0,
            minRotation: 0,
          },
          time: {
            unit: timeUnit,
            displayFormats: {
              minute: "x",
              hour: "x",
              day: "x",
            },
            parser: (timestamp: unknown) => {
              return parseBarChartTimestamp(timestamp as string | number);
            },
          },
        },
        y: {
          position: "left",
          min: 0,
          grid: {
            color: borderFaintColor,
            tickLength: 0,
          },
          border: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 6,
            color: textColorPrimary,
            font: {
              size: 11,
            },
            padding: 8,
          },
        },
      },
      animation: {
        duration: 0,
      },
      elements: {
        bar: {
          backgroundColor: getBarColor,
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          position: "cursor",
          callbacks: {
            title([item]: TooltipItem<"bar" | "line">[]) {
              const xValue = item?.parsed?.x;

              if (xValue == null) {
                return "";
              }

              const timestamp = parseBarChartTimestamp(getBarChartTickTimestamp(xValue));

              if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
                return "";
              }

              return formatTooltipTimestamp(timestamp);
            },
            labelColor: ({ datasetIndex }: TooltipItem<"bar" | "line">) =>
              typeof datasetIndex === "number"
                ? {
                    borderColor: "darkgray",
                    backgroundColor: datasets[datasetIndex].borderColor as string,
                  }
                : {
                    borderColor: "darkgray",
                    backgroundColor: "gray",
                  },
          },
        },
      },
    };

    return (
      <Chart
        className={cssNames("BarChart flex flex-col grow shrink-0 basis-0", className)}
        type={useSteppedStyle ? ChartKind.LINE : ChartKind.BAR}
        data={{ datasets, ...rest }}
        options={merge(barOptions, customOptions)}
        plugins={plugins}
        {...settings}
      />
    );
  },
);

export const BarChart = withInjectables<Dependencies, BarChartProps>(NonInjectedBarChart, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});

const tooltipCallbackWith =
  (precision: number) =>
  (context: TooltipItem<"bar" | "line">): string => {
    const { label } = context.dataset;
    const value = context.parsed.y;

    if (!label) {
      return "<unknown>";
    }

    assert(typeof value === "number");

    return `${label}: ${bytesToUnits(parseInt(value.toString()), { precision })}`;
  };

// Default options for all charts containing memory units (network, disk, memory, etc)
export const memoryOptions: ChartOptions = {
  scales: {
    y: {
      ticks: {
        callback: (value) => {
          if (typeof value == "string") {
            const float = parseFloat(value);

            if (float < 1) {
              return float.toFixed(3);
            }

            return bytesToUnits(parseInt(value));
          }

          return bytesToUnits(value);
        },
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: tooltipCallbackWith(3),
      },
    },
  },
};

// Default options for all charts with cpu units or other decimal numbers
export const cpuOptions: ChartOptions = {
  scales: {
    y: {
      ticks: {
        callback: (value) => {
          const float = parseFloat(`${value}`);

          if (float == 0) return "0";
          if (float < 10) return float.toFixed(3);
          if (float < 100) return float.toFixed(2);

          return float.toFixed(1);
        },
      },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: tooltipCallbackWith(2),
      },
    },
  },
};
