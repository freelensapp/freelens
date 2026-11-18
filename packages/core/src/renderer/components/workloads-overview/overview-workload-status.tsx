/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview-workload-status.scss";

import { object } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { capitalize } from "es-toolkit";
import { observer } from "mobx-react";
import activeThemeInjectable from "../../themes/active.injectable";
import { PieChart } from "../chart";

import type { PascalCase } from "@freelensapp/type-fest";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { PieChartData } from "../chart";
import type { Workload } from "./workloads/workload-injection-token";

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

const NonInjectedWorkloadStatusChart = observer((props: WorkloadStatusChartProps & Dependencies) => {
  const { status, activeTheme, "data-testid": testId } = props;

  const statusesToBeShown = object.entries(status).filter(([, val]) => val > 0);
  const theme = activeTheme.get();

  const emptyDataSet = {
    data: [1],
    backgroundColor: [theme.colors.pieChartDefaultColor],
    label: "Empty",
  };
  const statusDataSet = {
    label: "Status",
    data: statusesToBeShown.map(([, value]) => value),
    backgroundColor: statusesToBeShown.map(
      ([status]) => theme.colors[statusBackgroundColorMapping[toLowercase(status)]],
    ),
    tooltipLabels: statusesToBeShown.map(
      ([status]) =>
        (percent: string) =>
          `${capitalize(status)}: ${percent}`,
    ),
  };

  const chartData: Required<PieChartData> = {
    datasets: [statusesToBeShown.length > 0 ? statusDataSet : emptyDataSet],

    labels: statusesToBeShown.map(([status, value]) => `${capitalize(status)}: ${value}`),
  };

  return (
    <div className="OverviewWorkloadStatus">
      <div className="flex flex-col items-center grow shrink-0 basis-0">
        <PieChart
          data={chartData}
          options={{
            elements: {
              arc: {
                borderWidth: 0,
              },
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
