/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import Color from "color";
import { ChartKind } from "../chart/chart";

import type { ChartDataPoint, ChartDataSets } from "../chart/chart";

export interface ClusterMetricsLineReference {
  /** Shown in the legend of the chart, and part of the id of the dataset. */
  name: string;
  value: number | undefined;
  color: string;
}

export interface ClusterMetricsLineDatasetsOptions {
  id: string;
  label: string;
  color: string;
  data: { x: number; y: number | string }[];
  references: ClusterMetricsLineReference[];
  /** The visible range, in unix milliseconds. Without it the reference lines span the data. */
  fromX?: number;
  toX?: number;
}

const referenceDash = [5, 4];

/**
 * The metric of the cluster as a smooth line with a light fill and no points, followed by a dashed
 * line across the visible range for every reference value that is known: the requests and what is
 * allocatable.
 *
 * Every dataset sets its own type and style, so it draws as a line whichever chart type `BarChart`
 * picks for the range, and none of the defaults of `BarChart` applies.
 */
export const getClusterMetricsLineDatasets = ({
  id,
  label,
  color,
  data,
  references,
  fromX,
  toX,
}: ClusterMetricsLineDatasetsOptions): ChartDataSets[] => {
  const usage: ChartDataSets = {
    id,
    label,
    type: ChartKind.LINE,
    data,
    borderColor: color,
    backgroundColor: Color(color).alpha(0.12).string(),
    borderWidth: 2,
    fill: true,
    stepped: false,
    tension: 0.3,
    pointRadius: 0,
    pointHoverRadius: 3,
    barPercentage: undefined,
    categoryPercentage: undefined,
  };

  if (data.length === 0) {
    return [usage];
  }

  const start = fromX ?? data[0].x;
  const end = toX ?? data[data.length - 1].x;

  return [
    usage,
    ...references
      .filter((reference): reference is ClusterMetricsLineReference & { value: number } =>
        Number.isFinite(reference.value),
      )
      .map(
        ({ name, value, color: referenceColor }): ChartDataSets => ({
          id: `${id}-${name.toLowerCase()}`,
          label: name,
          type: ChartKind.LINE,
          data: [
            { x: start, y: value },
            { x: end, y: value },
          ] satisfies ChartDataPoint[],
          borderColor: referenceColor,
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderDash: referenceDash,
          fill: false,
          stepped: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          barPercentage: undefined,
          categoryPercentage: undefined,
        }),
      ),
  ];
};
