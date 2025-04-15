/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import { bytesToUnits, cssNames, isObject } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { ChartOptions, ChartTooltipCallback, ChartTooltipItem, Scriptable } from "chart.js";
import Color from "color";
import merge from "lodash/merge";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import moment from "moment";
import React from "react";
import activeThemeInjectable from "../../themes/active.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import { NoMetrics } from "../resource-metrics/no-metrics";
import type { ChartProps } from "./chart";
import { Chart, ChartKind } from "./chart";
import { ZebraStripesPlugin } from "./zebra-stripes.plugin";

export interface BarChartProps extends ChartProps {
  name?: string;
  timeLabelStep?: number; // Minute labels appearance step
}

const getBarColor: Scriptable<string> = ({ dataset }) => Color(dataset?.borderColor).alpha(0.2).string();

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedBarChart = observer(
  ({
    activeTheme,
    name,
    data,
    className,
    timeLabelStep = 10,
    plugins,
    options: customOptions,
    ...settings
  }: Dependencies & BarChartProps) => {
    const { textColorPrimary, borderFaintColor, chartStripesColor } = activeTheme.get().colors;
    const { datasets: rawDatasets = [], ...rest } = data;
    const datasets = rawDatasets
      .filter((set) => set.data?.length)
      .map((item) => ({
        type: ChartKind.BAR,
        borderWidth: { top: 3 },
        barPercentage: 1,
        categoryPercentage: 1,
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

    const formatTimeLabels = (timestamp: string, index: number) => {
      const label = moment(parseInt(timestamp)).format("HH:mm");
      const offset = "     ";

      if (index == 0) return offset + label;
      if (index == 60) return label + offset;

      return index % timeLabelStep == 0 ? label : "";
    };

    const barOptions: ChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      scales: {
        xAxes: [
          {
            type: "time",
            offset: true,
            gridLines: {
              display: false,
            },
            stacked: true,
            ticks: {
              callback: formatTimeLabels,
              autoSkip: false,
              source: "data",
              backdropColor: "white",
              fontColor: textColorPrimary,
              fontSize: 11,
              maxRotation: 0,
              minRotation: 0,
            },
            bounds: "data",
            time: {
              unit: "minute",
              displayFormats: {
                minute: "x",
              },
              parser: (timestamp) => moment.unix(parseInt(timestamp)),
            },
          },
        ],
        yAxes: [
          {
            position: "right",
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
        type={ChartKind.BAR}
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
