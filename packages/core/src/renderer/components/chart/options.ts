/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { bytesToUnits, isDefined } from "@freelensapp/utilities";

import type { ChartOptions, TooltipItem } from "chart.js";

export type MetricsTab = "CPU" | "Memory" | "Disk" | "Pods" | "Network" | "Filesystem" | "Duration";

const memoryLikeOptions: ChartOptions = {
  scales: {
    y: {
      ticks: {
        callback: (value: number | string): string => {
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
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<"bar" | "line">) => {
          const { label } = context.dataset;
          const value = context.parsed.y;

          if (!isDefined(value)) {
            return label ?? "";
          }

          return `${label}: ${bytesToUnits(parseInt(value.toString()), { precision: 3 })}`;
        },
      },
    },
  },
};

export const metricTabOptions: Record<MetricsTab, ChartOptions> = {
  Memory: memoryLikeOptions,
  Disk: memoryLikeOptions,
  Network: memoryLikeOptions,
  Filesystem: memoryLikeOptions,
  CPU: {
    scales: {
      y: {
        ticks: {
          callback: (value: number | string): string => {
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
          label: (context: TooltipItem<"bar" | "line">) => {
            const { label } = context.dataset;
            const value = context.parsed.y;

            if (!isDefined(value)) {
              return label ?? "";
            }

            return `${label}: ${value.toPrecision(2)}`;
          },
        },
      },
    },
  },
  Pods: {
    scales: {
      y: {
        ticks: {
          callback: (value) => value,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar" | "line">) => {
            const { label } = context.dataset;
            const value = context.parsed.y;

            if (!isDefined(value)) {
              return label ?? "";
            }

            return `${label}: ${value}`;
          },
        },
      },
    },
  },
  Duration: {
    scales: {
      y: {
        ticks: {
          callback: (value) => value,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar" | "line">) => {
            const { label } = context.dataset;
            const value = context.parsed.y;

            if (!isDefined(value)) {
              return label ?? "";
            }

            return `${label}: ${value.toFixed(3)} sec`;
          },
        },
      },
    },
  },
};
