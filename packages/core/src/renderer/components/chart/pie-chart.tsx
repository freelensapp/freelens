/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pie-chart.scss";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import activeThemeInjectable from "../../themes/active.injectable";
import { Chart } from "./chart";

import type { ChartOptions, ChartTypeRegistry, TooltipItem } from "chart.js";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { ChartData, ChartDataSets, ChartProps } from "./chart";

export interface PieChartProps extends ChartProps {}

export interface PieChartData extends ChartData {
  datasets?: PieChartDataSets[];
}

export type DatasetTooltipLabel = (percent: string) => string | string;

interface PieChartDataSets extends ChartDataSets {
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
    const opts: ChartOptions & { cutout?: string } = {
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          mode: "index",
          position: "cursor",
          callbacks: {
            title: () => "",
            label: (context: TooltipItem<keyof ChartTypeRegistry>) => {
              const dataset = context.dataset as PieChartDataSets;
              const datasetData = (dataset.data ?? []) as number[];
              const total = datasetData.reduce((acc, cur) => acc + cur, 0);
              const percent = Math.round(((datasetData[context.dataIndex] as number) / total) * 100);
              const percentLabel = isNaN(percent) ? "N/A" : `${percent}%`;
              const tooltipLabelCustomizer = dataset.tooltipLabels?.[context.dataIndex];

              return tooltipLabelCustomizer
                ? tooltipLabelCustomizer(percentLabel)
                : `${dataset.label}: ${percentLabel}`;
            },
          },
          filter: (context: TooltipItem<keyof ChartTypeRegistry>) => {
            const { datasetIndex, dataIndex, dataset } = context;

            if (datasetIndex === undefined) {
              return false;
            }

            const data = (dataset.data ?? []) as number[];

            if (context.chart.data.datasets.length === 1) return true;

            return dataIndex !== data.length - 1;
          },
        },
      },
      elements: {
        arc: {
          borderWidth: 1,
          borderColor: contentColor,
        },
      },
      cutout: `${getCutout(data.datasets?.length)}%`,
      responsive: true,
      ...options,
    };

    return (
      <Chart
        className={cssNames("PieChart flex flex-col items-center", className)}
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
