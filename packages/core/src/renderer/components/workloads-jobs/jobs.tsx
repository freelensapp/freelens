/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./jobs.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import { observer } from "mobx-react";
import React from "react";
import type { EventStore } from "../events/store";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { KubeObjectAge } from "../kube-object/age";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import type { JobStore } from "./store";
import jobStoreInjectable from "./store.injectable";

enum columnId {
  name = "name",
  namespace = "namespace",
  completions = "completions",
  conditions = "conditions",
  age = "age",
}

interface Dependencies {
  jobStore: JobStore;
  eventStore: EventStore;
}

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
          [columnId.conditions]: (job) => job.getCondition()?.type,
          [columnId.age]: (job) => -job.getCreationTimestamp(),
        }}
        searchFilters={[(job) => job.getSearchFields()]}
        renderHeaderTitle="Jobs"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Completions", className: "completions", id: columnId.completions },
          { className: "warning", showWithColumn: columnId.completions },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          { title: "Conditions", className: "conditions", sortBy: columnId.conditions, id: columnId.conditions },
        ]}
        renderTableContents={(job) => {
          const condition = job.getCondition();

          return [
            job.getName(),
            <NamespaceSelectBadge key="namespace" namespace={job.getNs()} />,
            `${job.getCompletions()} / ${job.getDesiredCompletions()}`,
            <KubeObjectStatusIcon key="icon" object={job} />,
            <KubeObjectAge key="age" object={job} />,
            condition && {
              title: condition.type,
              className: kebabCase(condition.type),
            },
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
