/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { Badge, WithTooltip } from "../badge";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import replicationControllerStoreInjectable from "./replication-controller-store.injectable";
import "./replication-controllers.scss";

import type { ReplicationControllerStore } from "./replication-controller-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  desired = "desired",
  current = "current",
  ready = "ready",
  selector = "selector",
}

interface Dependencies {
  store: ReplicationControllerStore;
}

const NonInjectedReplicationControllers = observer((props: Dependencies) => (
  <SiblingsInTabLayout>
    <KubeObjectListLayout
      isConfigurable
      tableId="workload_replication_controllers"
      className="ReplicationControllers"
      store={props.store}
      sortingCallbacks={{
        [columnId.name]: (item) => item.getName(),
        [columnId.namespace]: (item) => item.getNs(),
        [columnId.selector]: (item) => item.getSelectorLabels(),
        [columnId.desired]: (item) => item.getDesiredReplicas(),
        [columnId.current]: (item) => item.getReplicas(),
        [columnId.ready]: (item) => item.status?.readyReplicas,
      }}
      searchFilters={[(item) => item.getSearchFields(), (item) => item.getSelectorLabels()]}
      renderHeaderTitle="Replication Controllers"
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
        {
          title: "Selector",
          className: "selector",
          sortBy: columnId.selector,
          id: columnId.selector,
        },
      ]}
      renderTableContents={(item) => [
        <WithTooltip>{item.getName()}</WithTooltip>,
        <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
        item.getReplicas() || 0,
        item.getDesiredReplicas(),
        item.status?.readyReplicas || 0,
        item.getSelectorLabels().map((label) => <Badge key={label} label={label} tooltip={label} />),
      ]}
    />
  </SiblingsInTabLayout>
));

export const ReplicationControllers = withInjectables<Dependencies>(NonInjectedReplicationControllers, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(replicationControllerStoreInjectable),
  }),
});
