/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cronjobs.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import moment from "moment";
import React from "react";
import type { EventStore } from "../events/store";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { KubeObjectAge } from "../kube-object/age";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import type { CronJobStore } from "./store";
import cronJobStoreInjectable from "./store.injectable";

enum columnId {
  name = "name",
  namespace = "namespace",
  schedule = "schedule",
  suspend = "suspend",
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
          [columnId.suspend]: (cronJob) => cronJob.getSuspendFlag(),
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
          { title: "Suspend", className: "suspend", sortBy: columnId.suspend, id: columnId.suspend },
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
          cronJob.getName(),
          <KubeObjectStatusIcon key="icon" object={cronJob} />,
          <NamespaceSelectBadge key="namespace" namespace={cronJob.getNs()} />,
          cronJob.isNeverRun() ? "never" : cronJob.getSchedule(),
          cronJob.getSuspendFlag(),
          cronJobStore.getActiveJobsNum(cronJob),
          cronJob.getLastScheduleTime(),
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
