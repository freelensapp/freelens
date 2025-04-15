/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pie-chart.scss";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { ChartOptions } from "chart.js";
import ChartJS from "chart.js";
import type { IComputedValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import activeThemeInjectable from "../../themes/active.injectable";
import type { LensTheme } from "../../themes/lens-theme";
import type { ChartProps } from "./chart";
import { Chart } from "./chart";

export interface PieChartProps extends ChartProps {}

export interface PieChartData extends ChartJS.ChartData {
  datasets?: PieChartDataSets[];
}

export type DatasetTooltipLabel = (percent: string) => string | string;

interface PieChartDataSets extends ChartJS.ChartDataSets {
  id?: string;
  tooltipLabels?: DatasetTooltipLabel[];
}

function getCutout(length: number | undefined): number {
  switch (length) {
    case 0:
    case 1:
      return 88;
    case 2:
      return 76;
    case 3:
      return 63;
    default:
      return 50;
  }
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedPieChart = observer(
  ({ activeTheme, data, className, options, showChart, ...chartProps }: Dependencies & PieChartProps) => {
    const { contentColor } = activeTheme.get().colors;
    const opts: ChartOptions = {
      maintainAspectRatio: false,
      tooltips: {
        mode: "index",
        callbacks: {
          title: () => "",
          label: (tooltipItem: { datasetIndex: number; index: number }, data: PieChartData) => {
            const dataset = data.datasets?.[tooltipItem.datasetIndex] ?? {};
            const datasetData = (dataset.data ?? []) as number[];
            const total = datasetData.reduce((acc, cur) => acc + cur, 0);
            const percent = Math.round(((datasetData[tooltipItem.index] as number) / total) * 100);
            const percentLabel = isNaN(percent) ? "N/A" : `${percent}%`;
            const tooltipLabelCustomizer = dataset.tooltipLabels?.[tooltipItem.index];

            return tooltipLabelCustomizer ? tooltipLabelCustomizer(percentLabel) : `${dataset.label}: ${percentLabel}`;
          },
        },
        filter: ({ datasetIndex, index }, { datasets = [] }) => {
          if (datasetIndex === undefined) {
            return false;
          }

          const { data = [] } = datasets[datasetIndex];

          if (datasets.length === 1) return true;

          return index !== data.length - 1;
        },
        position: "cursor",
      },
      elements: {
        arc: {
          borderWidth: 1,
          borderColor: contentColor,
        },
      },
      cutoutPercentage: getCutout(data.datasets?.length),
      responsive: true,
      ...options,
    };

    return (
      <Chart
        className={cssNames("PieChart flex column align-center", className)}
        data={data}
        options={showChart ? {} : opts}
        showChart={showChart}
        {...chartProps}
      />
    );
  },
);

export const PieChart = withInjectables<Dependencies, PieChartProps>(NonInjectedPieChart, {
  getProps: (di, props) => ({
    ...props,
    activeTheme: di.inject(activeThemeInjectable),
  }),
});

ChartJS.Tooltip.positioners.cursor = function (elements: any, position: { x: number; y: number }) {
  return position;
};
