/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview-statuses.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { formatKubeApiResource } from "../../../common/rbac";
import overviewStyleInjectable from "../../../features/user-preferences/common/overview-style.injectable";
import { OverviewWorkloadStatus } from "./overview-workload-status";
import { WorkloadStatusCards } from "./workload-status-cards";
import workloadsInjectable from "./workloads/workloads.injectable";

import type { IComputedValue } from "mobx";

import type { OverviewStylePreference } from "../../../features/user-preferences/common/preferences-helpers";
import type { Workload } from "./workloads/workload-injection-token";

export interface OverviewStatusesProps {}

interface Dependencies {
  workloads: IComputedValue<Workload[]>;
  overviewStyle: IComputedValue<OverviewStylePreference>;
}

const NonInjectedOverviewStatuses = observer(({ workloads, overviewStyle }: Dependencies & OverviewStatusesProps) => {
  if (overviewStyle.get() === "cards") {
    return <WorkloadStatusCards workloads={workloads.get()} />;
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
    overviewStyle: di.inject(overviewStyleInjectable),
    ...props,
  }),
});
