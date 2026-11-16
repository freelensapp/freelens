/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview-statuses.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { formatKubeApiResource } from "../../../common/rbac";
import activeThemeInjectable from "../../themes/active.injectable";
import { OverviewWorkloadStatus } from "./overview-workload-status";
import { WorkloadStatusCards } from "./workload-status-cards";
import workloadsInjectable from "./workloads/workloads.injectable";

import type { IComputedValue } from "mobx";

import type { LensTheme } from "../../themes/lens-theme";
import type { Workload } from "./workloads/workload-injection-token";

export interface OverviewStatusesProps {}

interface Dependencies {
  workloads: IComputedValue<Workload[]>;
  activeTheme: IComputedValue<LensTheme>;
}

const NonInjectedOverviewStatuses = observer(({ workloads, activeTheme }: Dependencies & OverviewStatusesProps) => {
  const theme = activeTheme.get();

  // Themes with the v2 interface show status cards instead of one ring chart per workload kind.
  if (theme.uiV2) {
    return (
      <div className="OverviewStatuses">
        <WorkloadStatusCards workloads={workloads.get()} theme={theme} />
      </div>
    );
  }

  return (
    <div className="OverviewStatuses">
      <div className="workloads">
        {workloads.get().map((workload) => (
          <div className="workload" key={formatKubeApiResource(workload.resource)}>
            <div className="title">
              <a onClick={workload.open}>{`${workload.title} (${workload.amountOfItems.get()})`}</a>
            </div>

            <OverviewWorkloadStatus workload={workload} />
          </div>
        ))}
      </div>
    </div>
  );
});

export const OverviewStatuses = withInjectables<Dependencies, OverviewStatusesProps>(NonInjectedOverviewStatuses, {
  getProps: (di, props) => ({
    workloads: di.inject(workloadsInjectable),
    activeTheme: di.inject(activeThemeInjectable),
    ...props,
  }),
});
