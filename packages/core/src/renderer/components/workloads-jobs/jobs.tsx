/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./jobs.scss";

import { formatDuration } from "@freelensapp/utilities/dist";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge, WithTooltip } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { LocaleDate } from "../locale-date";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import jobStoreInjectable from "./store.injectable";

import type { Job } from "@freelensapp/kube-object";

import type { EventStore } from "../events/store";
import type { JobStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  suspend = "suspend",
  status = "status",
  succeeded = "succeeded",
  completions = "completions",
  parallelism = "parallelism",
  duration = "duration",
  age = "age",
}

export function getStatusText(obj: Job) {
  const conditions = obj.getConditions();
  if (!conditions || !conditions.length) {
    return "Unknown";
  }
  if (obj.hasCondition("Complete")) {
    return "Complete";
  } else if (obj.hasCondition("Failed")) {
    return "Failed";
  } else if (obj.metadata.deletionTimestamp) {
    return "Terminating";
  } else if (obj.hasCondition("Suspended")) {
    return "Suspended";
  } else if (obj.hasCondition("FailureTarget")) {
    return "FailureTarget";
  }
  return "Running";
}

export type JobStatus = ReturnType<typeof getStatusText>;

export function getStatusClass(obj: Job) {
  const status = getStatusText(obj);
  switch (status) {
    case "Complete":
      return "success";
    case "Failed":
    case "FailureTarget":
      return "error";
    case "Running":
      return "info";
    case "Suspended":
      return "warning";
    default:
      return "";
  }
}

interface Dependencies {
  jobStore: JobStore;
  eventStore: EventStore;
}

const durationTooltip = (job: Job) => {
  const startTime = job.status?.startTime;
  const completionTime = job.status?.completionTime;
  if (!startTime) {
    return "";
  }
  if (!completionTime) {
    return `Start time: ${startTime}`;
  }
  return (
    <>
      Start time: <LocaleDate date={startTime} />
      <br />
      Completion time: <LocaleDate date={completionTime} />
    </>
  );
};

const NonInjectedJobs = observer((props: Dependencies) => {
  const { eventStore, jobStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_jobs"
        className="Jobs"
        store={jobStore}
        dependentStores={[eventStore]} // status icon component uses event store
        sortingCallbacks={{
          [columnId.name]: (job) => job.getName(),
          [columnId.namespace]: (job) => job.getNs(),
          [columnId.suspend]: (job) => job.getSuspendFlag(),
          [columnId.succeeded]: (job) => job.getCompletions(),
          [columnId.completions]: (job) => job.getDesiredCompletions(),
          [columnId.parallelism]: (job) => job.getParallelism(),
          [columnId.status]: (job) => getStatusText(job),
          [columnId.duration]: (job) => job.getJobDuration(),
          [columnId.age]: (job) => -job.getCreationTimestamp(),
        }}
        searchFilters={[(job) => job.getSearchFields()]}
        renderHeaderTitle="Jobs"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { className: "warning", showWithColumn: columnId.name },
          { title: "Suspend", className: "suspend", sortBy: columnId.suspend, id: columnId.suspend },
          { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          { title: "Succeeded", className: "succeeded", sortBy: columnId.succeeded, id: columnId.succeeded },
          { title: "Completions", className: "completions", sortBy: columnId.completions, id: columnId.completions },
          { title: "Parallelism", className: "parallelism", sortBy: columnId.parallelism, id: columnId.parallelism },
          { title: "Duration", className: "duration", sortBy: columnId.duration, id: columnId.duration },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(job) => {
          return [
            <WithTooltip>{job.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={job.getNs()} />,
            <KubeObjectStatusIcon key="icon" object={job} />,
            job.getSuspendFlag(),
            <Badge className={getStatusClass(job)} label={getStatusText(job)} tooltip={getStatusText(job)} />,
            job.getCompletions(),
            job.getDesiredCompletions(),
            job.getParallelism(),
            <WithTooltip tooltip={durationTooltip(job)}>{formatDuration(job.getJobDuration())}</WithTooltip>,
            <KubeObjectAge key="age" object={job} />,
          ];
        }}
      />
    </SiblingsInTabLayout>
  );
});

export const Jobs = withInjectables<Dependencies>(NonInjectedJobs, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    jobStore: di.inject(jobStoreInjectable),
  }),
});
