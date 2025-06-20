/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./replicasets.scss";

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
import replicaSetStoreInjectable from "./store.injectable";

import type { EventStore } from "../events/store";
import type { ReplicaSetStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  desired = "desired",
  current = "current",
  ready = "ready",
  age = "age",
}

interface Dependencies {
  replicaSetStore: ReplicaSetStore;
  eventStore: EventStore;
}

const NonInjectedReplicaSets = observer((props: Dependencies) => {
  const { eventStore, replicaSetStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_replicasets"
        className="ReplicaSets"
        store={replicaSetStore}
        dependentStores={[eventStore]} // status icon component uses event store
        sortingCallbacks={{
          [columnId.name]: (replicaSet) => replicaSet.getName(),
          [columnId.namespace]: (replicaSet) => replicaSet.getNs(),
          [columnId.desired]: (replicaSet) => replicaSet.getDesired(),
          [columnId.current]: (replicaSet) => replicaSet.getCurrent(),
          [columnId.ready]: (replicaSet) => replicaSet.getReady(),
          [columnId.age]: (replicaSet) => -replicaSet.getCreationTimestamp(),
        }}
        searchFilters={[(replicaSet) => replicaSet.getSearchFields()]}
        renderHeaderTitle="Replica Sets"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { className: "warning", showWithColumn: columnId.name },
          {
            title: "Namespace",
            className: "namespace",
            sortBy: columnId.namespace,
            id: columnId.namespace,
          },
          {
            title: "Desired",
            className: "desired",
            sortBy: columnId.desired,
            id: columnId.desired,
          },
          {
            title: "Current",
            className: "current",
            sortBy: columnId.current,
            id: columnId.current,
          },
          { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(replicaSet) => [
          <WithTooltip>{replicaSet.getName()}</WithTooltip>,
          <KubeObjectStatusIcon key="icon" object={replicaSet} />,
          <NamespaceSelectBadge key="namespace" namespace={replicaSet.getNs()} />,
          replicaSet.getDesired(),
          replicaSet.getCurrent(),
          replicaSet.getReady(),
          <KubeObjectAge key="age" object={replicaSet} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const ReplicaSets = withInjectables<Dependencies>(NonInjectedReplicaSets, {
  getProps: (di, props) => ({
    ...props,
    eventStore: di.inject(eventStoreInjectable),
    replicaSetStore: di.inject(replicaSetStoreInjectable),
  }),
});
