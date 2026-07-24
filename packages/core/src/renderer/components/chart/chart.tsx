/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./chart.scss";
import "./chartjs-adapter-native";

import { cssNames } from "@freelensapp/utilities";
import { Chart as ChartJS, registerables, Tooltip } from "chart.js";
import { merge, remove } from "es-toolkit/compat";
import React from "react";
import { Badge } from "../badge";
import { StatusBrick } from "../status-brick";

import type { ChartData as ChartJSData, ChartOptions, ChartType, Plugin, TooltipPositionerFunction } from "chart.js";
import type { CSSProperties } from "react";

// Register all controllers, elements, scales and plugins once. Individual
// tree-shaken registrations can be a later optimization.
ChartJS.register(...registerables);

// Custom tooltip positioner that places the tooltip at the cursor position.
// Used by both the bar and pie charts via `position: "cursor"`.
declare module "chart.js" {
  interface TooltipPositionerMap {
    cursor: TooltipPositionerFunction<ChartType>;
  }
}

Tooltip.positioners.cursor = (_elements, eventPosition) => eventPosition;

// The wrapper accepts loosely typed data and casts it to the strict v4
// ChartData at the ChartJS boundary (see renderChart). Chart.js v4 parses data
// internally, so string/number-y point values are tolerated at runtime.
export type ChartDataPoint = number | { x: number | string; y: number | string } | null | undefined;

export interface ChartDataSets {
  id?: string;
  tooltip?: string;
  label?: string;
  data?: ChartDataPoint[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  [key: string]: unknown;
}

export interface ChartData {
  labels?: unknown[];
  datasets?: ChartDataSets[];
  [key: string]: unknown;
}

export interface ChartProps {
  data: ChartData;
  options?: ChartOptions; // Passed to ChartJS instance
  width?: number | string;
  height?: number | string;
  type?: ChartKind;
  showChart?: boolean; // Possible to show legend only if false
  showLegend?: boolean;
  legendPosition?: "bottom";
  legendColors?: string[]; // Hex colors for each of the labels in data object
  plugins?: Plugin[];
  redraw?: boolean; // If true - recreate chart instance with no animation
  title?: string;
  className?: string;
  "data-testid"?: string;
}

export enum ChartKind {
  PIE = "pie",
  BAR = "bar",
  LINE = "line",
  DOUGHNUT = "doughnut",
}

const defaultProps: Partial<ChartProps> = {
  type: ChartKind.DOUGHNUT,
  options: {},
  showChart: true,
  showLegend: true,
  legendPosition: "bottom",
  plugins: [],
  redraw: false,
};

export class Chart extends React.Component<ChartProps> {
  static defaultProps = defaultProps as object;

  private canvas = React.createRef<HTMLCanvasElement>();
  private chart: ChartJS | null = null;
  // ChartJS adds _meta field to any data object passed to it.
  // We clone new data prop into currentChartData to compare props and prevProps
  private currentChartData?: ChartData;

  componentDidMount() {
    const { showChart } = this.props;

    if (showChart) {
      this.renderChart();
    }
  }

  componentDidUpdate() {
    const { showChart, redraw } = this.props;

    if (redraw) {
      this.chart?.destroy();
      this.renderChart();
    } else if (showChart) {
      if (!this.chart) {
        this.renderChart();
      } else {
        this.updateChart();
      }
    }
  }

  componentWillUnmount() {
    // Destroy the Chart.js instance so its canvas is released. Without this the
    // instance leaks on unmount and a remount hits "Canvas is already in use"
    // (surfaced by React.StrictMode's mount → unmount → mount double-invoke).
    this.chart?.destroy();
    this.chart = null;
  }

  memoizeDataProps() {
    const { data } = this.props;

    this.currentChartData = {
      ...data,
      datasets:
        data.datasets &&
        data.datasets.map((set) => {
          return {
            ...set,
          };
        }),
    };
  }

  updateChart() {
    const { options } = this.props;

    if (!this.chart) return;

    // Merge into the raw config options, not `this.chart.options` (the resolved
    // options proxy). The proxy exposes Chart.js's internal descriptor keys
    // `_scriptable`/`_indexable` (functions); es-toolkit `merge` would copy them
    // into the options object, and on the next update Chart.js would resolve
    // them as scriptable options and call them, throwing "name.startsWith is not
    // a function". Chart.js v4 removed `helpers.configMerge`, which used to skip
    // these keys.
    this.chart.options = merge(this.chart.config.options ?? {}, options);

    this.memoizeDataProps();

    const datasets = this.chart.config.data.datasets as unknown as ChartDataSets[];
    const nextDatasets: ChartDataSets[] = ((this.currentChartData ??= {}).datasets ??= []);

    // Remove stale datasets if they're not available in nextDatasets
    if (datasets.length > nextDatasets.length) {
      const sets = [...datasets];

      sets.forEach((set) => {
        if (!nextDatasets.find((next) => next.id === set.id)) {
          remove(datasets, (item) => item.id === set.id);
        }
      });
    }

    // Mutating inner chart datasets to enable seamless transitions
    nextDatasets.forEach((next, datasetIndex) => {
      const index = datasets.findIndex((set) => set.id === next.id);

      if (index !== -1) {
        const data = (datasets[index].data = (datasets[index].data ?? []).slice()); // "Clean" mobx observables data to use in ChartJS
        const nextData = (next.data ??= []);

        data.splice(next.data.length);

        for (let dataIndex = 0; dataIndex < nextData.length; dataIndex += 1) {
          data[dataIndex] = nextData[dataIndex];
        }

        // Merge other fields
        const { data: _data, ...props } = next;

        datasets[index] = {
          ...datasets[index],
          ...props,
        };
      } else {
        datasets[datasetIndex] = next;
      }
    });
    this.chart.update();
  }

  renderLegend() {
    if (!this.props.showLegend) return null;
    const { data, legendColors } = this.props;
    const { labels, datasets } = data;
    const labelElem = (
      title: string | undefined,
      color: string | CSSProperties["backgroundColor"],
      tooltip?: string,
    ) => (
      <Badge
        key={title}
        className="LegendBadge flex gap-2 items-center"
        label={
          <div className="flex items-center">
            <StatusBrick style={{ backgroundColor: color }} className="shrink-0" />
            <span>{title}</span>
          </div>
        }
        tooltip={tooltip}
        expandable={false}
      />
    );

    return (
      <div className="legend flex flex-wrap">
        {labels
          ? labels.map((label, index) => {
              const { backgroundColor = [] } = datasets?.[0] ?? {};
              const color = legendColors ? legendColors[index] : (backgroundColor as string[])[index];

              return labelElem(label as string, color);
            })
          : datasets?.map(({ borderColor, label, tooltip }) => labelElem(label, borderColor as string, tooltip))}
      </div>
    );
  }

  renderChart() {
    const { type, options, plugins } = this.props;
    const canvas = this.canvas.current;

    if (!canvas) {
      return;
    }

    this.memoizeDataProps();

    this.chart = new ChartJS(canvas, {
      type: type as ChartType,
      plugins: plugins as Plugin<ChartType>[],
      options: {
        ...options,
        plugins: {
          ...options?.plugins,
          legend: {
            display: false,
          },
        },
      },
      data: this.currentChartData as unknown as ChartJSData,
    });
  }

  render() {
    const { width, height, showChart, title, className, "data-testid": dataTestId } = this.props;

    return (
      <div className={cssNames("Chart", className)} data-testid={dataTestId}>
        {title && <div className="chart-title">{title}</div>}
        {showChart && (
          <div className="chart-container">
            <canvas ref={this.canvas} width={width} height={height} />
            <div className="chartjs-tooltip flex flex-col"></div>
          </div>
        )}
        {this.renderLegend()}
      </div>
    );
  }
}
