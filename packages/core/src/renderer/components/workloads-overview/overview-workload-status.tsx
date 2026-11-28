/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview-workload-status.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { capitalize } from "es-toolkit";
import { observer } from "mobx-react";
import { useRef } from "react";
import activeThemeInjectable from "../../themes/active.injectable";
import { PieChart } from "../chart";

import type { PascalCase } from "@freelensapp/type-fest";

import type { ChartTypeRegistry, TooltipItem } from "chart.js";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { PieChartData } from "../chart";
import type { Workload } from "./workloads/workload-injection-token";

type PieChartDataSet = NonNullable<PieChartData["datasets"]>[number];

export type LowercaseOrPascalCase<T extends string> = Lowercase<T> | PascalCase<T>;

export type WorkloadStatus = Partial<Record<LowercaseOrPascalCase<keyof typeof statusBackgroundColorMapping>, number>>;

function toLowercase<T extends string>(src: T): Lowercase<T> {
  return src.toLowerCase() as Lowercase<T>;
}

export interface OverviewWorkloadStatusProps {
  workload: Workload;
}

export interface WorkloadStatusChartProps {
  /** The number of items in each status. */
  status: WorkloadStatus;
  "data-testid"?: string;
}

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
}

export const statusBackgroundColorMapping = {
  running: "colorOk",
  scheduled: "colorOk",
  pending: "colorWarning",
  suspended: "colorWarning",
  evicted: "colorError",
  succeeded: "colorSuccess",
  failed: "colorError",
  terminating: "colorTerminated",
  finalizing: "colorTerminated",
  terminated: "colorTerminated",
  unknown: "colorVague",
  complete: "colorSuccess",
} as const;

/** The number of items of a status, 0 for one that is not given or has no items. */
const countOf = (status: WorkloadStatus, name: string) => {
  const count = status[name as keyof WorkloadStatus];

  return typeof count === "number" && Number.isFinite(count) && count > 0 ? count : 0;
};

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The names of the statuses of the ring, in the order of its dataset: every status it has shown, in the order it
 * first got them, with the statuses it gets for the first time after them. A status keeps its place in the
 * dataset while the statuses before it come and go, so that Chart.js animates the arc of each status to its new
 * size, and to no width when it has no items, rather than the arc of one status into the arc of another.
 *
 * The memory is written while rendering. Rendering the same statuses again gives the same names, so a render that
 * React repeats or discards leaves the memory as a render that it keeps would.
 */
const useStatusNames = (status: WorkloadStatus) => {
  const memory = useRef<readonly string[]>([]);
  const added = Object.keys(status).filter((name) => !memory.current.includes(name));

  if (added.length > 0) {
    memory.current = [...memory.current, ...added];
  }

  return memory.current;
};

/**
 * The tooltip of the ring: the name and the share of the status under the cursor, and never of a status without
 * items, whose arc has no width. `PieChart` takes the options it is given over its own key by key, so the ring
 * gives the whole tooltip, with what `PieChart` has, rather than the filter alone.
 */
const tooltipOptions = {
  mode: "index",
  position: "cursor",
  callbacks: {
    title: () => "",
    label: (context: TooltipItem<keyof ChartTypeRegistry>) => {
      const { data = [], tooltipLabels } = context.dataset as unknown as PieChartDataSet;
      const values = data as number[];
      const total = values.reduce((sum, value) => sum + value, 0);
      const percent = total > 0 ? `${Math.round((values[context.dataIndex] / total) * 100)}%` : "N/A";

      return tooltipLabels?.[context.dataIndex]?.(percent) ?? "";
    },
  },
  filter: (context: TooltipItem<keyof ChartTypeRegistry>) => Number(context.raw) > 0,
} as const;

const NonInjectedWorkloadStatusChart = observer((props: WorkloadStatusChartProps & Dependencies) => {
  const { status, activeTheme, "data-testid": testId } = props;
  const theme = activeTheme.get();
  const names = useStatusNames(status);
  const counts = names.map((name) => countOf(status, name));
  const isEmpty = counts.every((count) => count === 0);
  const colorOf = (name: string) =>
    theme.colors[statusBackgroundColorMapping[toLowercase(name) as keyof typeof statusBackgroundColorMapping]];
  const shown = names.filter((_, index) => counts[index] > 0);

  // One dataset for the statuses and the grey ring of no items, which is its first value: 1 when no status has
  // items and 0 otherwise. The ring then turns grey, and back, with the same animation as any other change.
  const chartData: PieChartData = {
    datasets: [
      {
        label: "Status",
        data: [isEmpty ? 1 : 0, ...counts],
        backgroundColor: [theme.colors.pieChartDefaultColor, ...names.map(colorOf)],
        tooltipLabels: [
          (percent: string) => `Empty: ${percent}`,
          ...names.map((name) => (percent: string) => `${capitalize(name)}: ${percent}`),
        ],
      },
    ],
    labels: shown.map((name) => `${capitalize(name)}: ${countOf(status, name)}`),
  };

  return (
    <div className="OverviewWorkloadStatus">
      <div className="flex flex-col items-center grow shrink-0 basis-0">
        <PieChart
          data={chartData}
          legendColors={shown.map(colorOf)}
          options={{
            // An object rather than no key, as `Chart` merges the options of an update into those it has: the
            // animation comes back when reduced motion no longer matches.
            animation: prefersReducedMotion() ? false : {},
            elements: {
              arc: {
                borderWidth: 0,
              },
            },
            plugins: {
              tooltip: tooltipOptions,
            },
          }}
          data-testid={testId}
        />
      </div>
    </div>
  );
});

/**
 * The ring chart of the statuses of one kind of workload, as the workloads overview shows it with the Charts style.
 */
export const WorkloadStatusChart = withInjectables<Dependencies, WorkloadStatusChartProps>(
  NonInjectedWorkloadStatusChart,
  {
    getProps: (di, props) => ({
      ...props,
      activeTheme: di.inject(activeThemeInjectable),
    }),
  },
);

export const OverviewWorkloadStatus = observer(({ workload }: OverviewWorkloadStatusProps) => (
  <WorkloadStatusChart
    status={workload.status.get()}
    data-testid={`workload-overview-status-chart-${workload.title.toLowerCase().replace(/\s+/, "-")}`}
  />
));
