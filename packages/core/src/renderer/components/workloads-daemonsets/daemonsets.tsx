/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./daemonsets.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import daemonSetStoreInjectable from "./store.injectable";

import type { EventStore } from "../events/store";
import type { DaemonSetStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  desired = "desired",
  current = "current",
  ready = "ready",
  updated = "updated",
  available = "available",
  labels = "labels",
  age = "age",
}

interface Dependencies {
  daemonSetStore: DaemonSetStore;
  eventStore: EventStore;
}

const NonInjectedDaemonSets = observer((props: Dependencies) => {
  const { daemonSetStore, eventStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="workload_daemonsets"
        className="DaemonSets"
        store={daemonSetStore}
        dependentStores={[eventStore]} // status icon component uses event store
        sortingCallbacks={{
          [columnId.name]: (daemonSet) => daemonSet.getName(),
          [columnId.namespace]: (daemonSet) => daemonSet.getNs(),
          [columnId.desired]: (daemonSet) => daemonSet.status?.desiredNumberScheduled,
          [columnId.current]: (daemonSet) => daemonSet.status?.currentNumberScheduled,
          [columnId.ready]: (daemonSet) => daemonSet.status?.numberReady,
          [columnId.updated]: (daemonSet) => daemonSet.status?.updatedNumberScheduled,
          [columnId.available]: (daemonSet) => daemonSet.status?.numberAvailable,
          [columnId.age]: (daemonSet) => -daemonSet.getCreationTimestamp(),
        }}
        searchFilters={[(daemonSet) => daemonSet.getSearchFields(), (daemonSet) => daemonSet.getLabels()]}
        renderHeaderTitle="Daemon Sets"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Namespace",
            className: "namespace",
            sortBy: columnId.namespace,
            id: columnId.namespace,
          },
          { title: "Desired", className: "desired", sortBy: columnId.desired, id: columnId.desired },
          { title: "Current", className: "current", sortBy: columnId.current, id: columnId.current },
          { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
          { title: "Updated", className: "updated", sortBy: columnId.updated, id: columnId.updated },
          { title: "Available", className: "available", sortBy: columnId.available, id: columnId.available },
          { className: "warning", showWithColumn: columnId.current },
          { title: "Node Selector", className: "labels scrollable", id: columnId.labels },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(daemonSet) => [
          <WithTooltip>{daemonSet.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={daemonSet.getNs()} />,
          daemonSet.status?.desiredNumberScheduled || 0,
          daemonSet.status?.currentNumberScheduled || 0,
          daemonSet.status?.numberReady || 0,
          daemonSet.status?.updatedNumberScheduled || 0,
          daemonSet.status?.numberAvailable || 0,
          <KubeObjectStatusIcon key="icon" object={daemonSet} />,
          daemonSet
            .getNodeSelectors()
            .map((selector) => <Badge key={selector} label={selector} tooltip={selector} scrollable />),
          <KubeObjectAge key="age" object={daemonSet} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const DaemonSets = withInjectables<Dependencies>(NonInjectedDaemonSets, {
  getProps: (di, props) => ({
    ...props,
    daemonSetStore: di.inject(daemonSetStoreInjectable),
    eventStore: di.inject(eventStoreInjectable),
  }),
});
