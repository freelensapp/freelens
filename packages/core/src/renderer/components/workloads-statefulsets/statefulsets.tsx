/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./statefulsets.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { WithTooltip } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import statefulSetStoreInjectable from "./store.injectable";

import type { EventStore } from "../events/store";
import type { StatefulSetStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  ready = "ready",
  desired = "desired",
  age = "age",
}

interface Dependencies {
  statefulSetStore: StatefulSetStore;
  eventStore: EventStore;
}

const NonInjectedStatefulSets = observer((props: Dependencies) => {
  const { eventStore, statefulSetStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_statefulsets"
        className="StatefulSets"
        store={statefulSetStore}
        dependentStores={[eventStore]}
        sortingCallbacks={{
          [columnId.name]: (statefulSet) => statefulSet.getName(),
          [columnId.namespace]: (statefulSet) => statefulSet.getNs(),
          [columnId.ready]: (statefulSet) => statefulSet.status?.readyReplicas,
          [columnId.desired]: (statefulSet) => statefulSet.getReplicas(),
          [columnId.age]: (statefulSet) => -statefulSet.getCreationTimestamp(),
        }}
        searchFilters={[(statefulSet) => statefulSet.getSearchFields()]}
        renderHeaderTitle="Stateful Sets"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Namespace",
            className: "namespace",
            sortBy: columnId.namespace,
            id: columnId.namespace,
          },
          { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
          {
            title: "Desired",
            className: "desired",
            sortBy: columnId.desired,
            id: columnId.desired,
          },
          { className: "warning", showWithColumn: columnId.ready },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(statefulSet) => [
          <WithTooltip>{statefulSet.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={statefulSet.getNs()} />,
          statefulSet.status?.readyReplicas || 0,
          statefulSet.getReplicas(),
          <KubeObjectStatusIcon key="icon" object={statefulSet} />,
          <KubeObjectAge key="age" object={statefulSet} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const StatefulSets = withInjectables<Dependencies>(NonInjectedStatefulSets, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    statefulSetStore: di.inject(statefulSetStoreInjectable),
  }),
});
