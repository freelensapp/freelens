/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits, cssNames, isObject } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import assert from "assert";
import Color from "color";
import merge from "lodash/merge";
import { observer } from "mobx-react";
import moment from "moment";
import React from "react";
import activeThemeInjectable from "../../themes/active.injectable";
import { NoMetrics } from "../resource-metrics/no-metrics";
import { Chart, ChartKind } from "./chart";
import { ZebraStripesPlugin } from "./zebra-stripes.plugin";

import type { ChartOptions, ChartTooltipCallback, ChartTooltipItem, Scriptable } from "chart.js";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { ChartProps } from "./chart";

export interface BarChartProps extends ChartProps {
  name?: string;
  timeLabelStep?: number; // Minute labels appearance step
  minTime?: number; // Minimum timestamp (unix seconds) for x-axis
  maxTime?: number; // Maximum timestamp (unix seconds) for x-axis
}

const getBarColor: Scriptable<string> = ({ dataset }) => Color(dataset?.borderColor).alpha(0.2).string();

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;
const FOUR_DAYS_SECONDS = 4 * ONE_DAY_SECONDS;

const getTimestampMillis = (timestamp: string | number): number => {
  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (/^\d+$/.test(timestamp)) {
    return Number(timestamp);
  }

  return Date.parse(timestamp);
};

const getTimeBucketAndLabel = (timestamp: string | number, timeRangeSeconds: number) => {
  const date = moment(getTimestampMillis(timestamp));

  if (timeRangeSeconds <= ONE_DAY_SECONDS) {
    return {
      bucket: date.startOf("minute").format("YYYY-MM-DD HH:mm"),
      label: date.format("HH:mm"),
    };
  }

  if (timeRangeSeconds < FOUR_DAYS_SECONDS) {
    return {
      bucket: date.startOf("hour").format("YYYY-MM-DD HH"),
      label: date.format("DD, HH:mm"),
    };
  }

  return {
    bucket: date.startOf("day").format("YYYY-MM-DD"),
    label: date.format("MMM DD"),
  };
};

const NonInjectedBarChart = observer(
  ({
    activeTheme,
    name,
    data,
    className,
    timeLabelStep = 10,
    minTime,
    maxTime,
    plugins,
    options: customOptions,
    ...settings
  }: Dependencies & BarChartProps) => {
    const { textColorPrimary, borderFaintColor, chartStripesColor } = activeTheme.get().colors;
    const { datasets: rawDatasets = [], ...rest } = data;
    const timeRangeSeconds = maxTime && minTime ? maxTime - minTime : 3600;
    const inferredStepSeconds = rawDatasets[0]?.data?.length
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
        steppedLine: useSteppedStyle,
        stepped: useSteppedStyle,
        lineTension: useSteppedStyle ? 0 : undefined,
        pointRadius: useSteppedStyle ? 0 : undefined,
        pointHoverRadius: useSteppedStyle ? 2 : undefined,
        fill: useSteppedStyle,
        backgroundColor: useSteppedStyle ? getBarColor({ dataset: item } as never) : undefined,
        ...item,
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

    const formatTimeLabels = (timestamp: string | number, index?: number, values?: Array<string | number>) => {
      const { bucket, label } = getTimeBucketAndLabel(timestamp, timeRangeSeconds);

      if (typeof index !== "number" || !values || index === 0) {
        return label;
      }

      const previousTimestamp = values[index - 1];
      const { bucket: previousBucket } = getTimeBucketAndLabel(previousTimestamp, timeRangeSeconds);

      return previousBucket === bucket ? "" : label;
    };

    const requestedMin = minTime ? minTime * 1000 : undefined;
    const requestedMax = maxTime ? maxTime * 1000 : undefined;

    const barOptions: ChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        xAxes: [
          {
            type: "time",
            offset: false,
            gridLines: {
              display: false,
            },
            stacked: true,
            ticks: {
              callback: formatTimeLabels,
              autoSkip: true,
              autoSkipPadding: 12,
              maxTicksLimit: maxTimeTicks,
              source: "auto",
              backdropColor: "white",
              fontColor: textColorPrimary,
              fontSize: 11,
              maxRotation: 0,
              minRotation: 0,
              min: requestedMin,
              max: requestedMax,
            },
            bounds: "data",
            time: {
              unit: "minute",
              displayFormats: {
                minute: "x",
                hour: "x",
                day: "x",
              },
              parser: (timestamp: string | number) => {
                return getTimestampMillis(timestamp);
              },
            },
          },
        ],
        yAxes: [
          {
            position: "left",
            gridLines: {
              color: borderFaintColor,
              drawBorder: false,
              tickMarkLength: 0,
              zeroLineWidth: 0,
            },
            ticks: {
              maxTicksLimit: 6,
              fontColor: textColorPrimary,
              fontSize: 11,
              padding: 8,
              min: 0,
            },
          },
        ],
      },
      tooltips: {
        mode: "index",
        position: "cursor",
        callbacks: {
          title([tooltip]: ChartTooltipItem[]) {
            const xLabel = tooltip?.xLabel;
            const skipLabel = xLabel == null || new Date(xLabel).getTime() > Date.now();

            if (skipLabel) return "";

            return String(xLabel);
          },
          labelColor: ({ datasetIndex }) =>
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
      animation: {
        duration: 0,
      },
      elements: {
        rectangle: {
          backgroundColor: getBarColor.bind(null),
        },
      },
    };

    return (
      <Chart
        className={cssNames("BarChart flex box grow column", className)}
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
  (precision: number): ChartTooltipCallback["label"] =>
  ({ datasetIndex, index }, { datasets = [] }) => {
    if (typeof datasetIndex !== "number" || typeof index !== "number") {
      return "";
    }

    const { label, data } = datasets[datasetIndex];

    if (!label || !data) {
      return "<unknown>";
    }

    const value = data[index];

    assert(isObject(value) && !Array.isArray(value) && typeof value.y === "number");

    return `${label}: ${bytesToUnits(parseInt(value.y.toString()), { precision })}`;
  };

// Default options for all charts containing memory units (network, disk, memory, etc)
export const memoryOptions: ChartOptions = {
  scales: {
    yAxes: [
      {
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
          stepSize: 1,
        },
      },
    ],
  },
  tooltips: {
    callbacks: {
      label: tooltipCallbackWith(3),
    },
  },
};

// Default options for all charts with cpu units or other decimal numbers
export const cpuOptions: ChartOptions = {
  scales: {
    yAxes: [
      {
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
    ],
  },
  tooltips: {
    callbacks: {
      label: tooltipCallbackWith(2),
    },
  },
};
