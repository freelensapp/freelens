/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cronjobs.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import cronstrue from "cronstrue";
import { observer } from "mobx-react";
import moment from "moment-timezone";
import React from "react";
import { BadgeBoolean } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import cronJobStoreInjectable from "./store.injectable";

import type { EventStore } from "../events/store";
import type { CronJobStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  schedule = "schedule",
  timezone = "timezone",
  resumed = "resumed",
  active = "active",
  lastSchedule = "last-schedule",
  age = "age",
}

interface Dependencies {
  cronJobStore: CronJobStore;
  eventStore: EventStore;
}

const NonInjectedCronJobs = observer((props: Dependencies) => {
  const { cronJobStore, eventStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_cronjobs"
        className="CronJobs"
        store={cronJobStore}
        dependentStores={[eventStore]}
        sortingCallbacks={{
          [columnId.name]: (cronJob) => cronJob.getName(),
          [columnId.namespace]: (cronJob) => cronJob.getNs(),
          [columnId.timezone]: (cronJob) => cronJob.spec.timeZone ?? "",
          [columnId.resumed]: (cronJob) => String(!cronJob.spec.suspend),
          [columnId.active]: (cronJob) => cronJobStore.getActiveJobsNum(cronJob),
          [columnId.lastSchedule]: (cronJob) =>
            cronJob.status?.lastScheduleTime ? moment().diff(cronJob.status.lastScheduleTime) : 0,
          [columnId.age]: (cronJob) => -cronJob.getCreationTimestamp(),
        }}
        searchFilters={[(cronJob) => cronJob.getSearchFields(), (cronJob) => cronJob.getSchedule()]}
        renderHeaderTitle="Cron Jobs"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { className: "warning", showWithColumn: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Schedule", className: "schedule", id: columnId.schedule },
          { title: "Timezone", className: "timezone", id: columnId.timezone },
          { title: "Resumed", className: "resumed", sortBy: columnId.resumed, id: columnId.resumed },
          { title: "Active", className: "active", sortBy: columnId.active, id: columnId.active },
          {
            title: "Last schedule",
            className: "last-schedule",
            sortBy: columnId.lastSchedule,
            id: columnId.lastSchedule,
          },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(cronJob) => [
          <WithTooltip>{cronJob.getName()}</WithTooltip>,
          <KubeObjectStatusIcon key="icon" object={cronJob} />,
          <NamespaceSelectBadge key="namespace" namespace={cronJob.getNs()} />,
          <WithTooltip
            tooltip={`${cronJob.getSchedule()} (${cronJob.isNeverRun() ? "never" : cronstrue.toString(cronJob.getSchedule())})`}
          >
            {cronJob.isNeverRun() ? "never" : cronJob.getSchedule()}
          </WithTooltip>,
          <WithTooltip>{cronJob.spec.timeZone}</WithTooltip>,
          <BadgeBoolean value={!cronJob.spec.suspend} />,
          cronJobStore.getActiveJobsNum(cronJob),
          <WithTooltip
            tooltip={cronJob.status?.lastScheduleTime ? moment(cronJob.status?.lastScheduleTime).toDate() : undefined}
          >
            {cronJob.getLastScheduleTime()}
          </WithTooltip>,
          <KubeObjectAge key="age" object={cronJob} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const CronJobs = withInjectables<Dependencies>(NonInjectedCronJobs, {
  getProps: (di, props) => ({
    ...props,
    cronJobStore: di.inject(cronJobStoreInjectable),
    eventStore: di.inject(eventStoreInjectable),
  }),
});
