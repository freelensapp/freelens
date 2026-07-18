/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../../kube-object/age";
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../namespaces/namespace-select-badge";
import { WithTooltip } from "../../with-tooltip";
import tcpRouteStoreInjectable from "./tcp-route-store.injectable";

import type { TCPRoute } from "@freelensapp/kube-object";

import type { TCPRouteStore } from "./tcp-route-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  parents = "parents",
  age = "age",
}

interface Dependencies {
  store: TCPRouteStore;
}

const NonInjectedTCPRoutes = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_tcp_routes"
        className="TCPRoutes"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: TCPRoute) => item.getName(),
          [columnId.namespace]: (item: TCPRoute) => item.getNs(),
          [columnId.age]: (item: TCPRoute) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: TCPRoute) => item.getSearchFields(),
          (item: TCPRoute) => item.getParentNames().join(" "),
        ]}
        renderHeaderTitle="TCPRoutes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Parents", className: "parents", id: columnId.parents },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: TCPRoute) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="parents">{item.getParentNames().join(", ") || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const TCPRoutes = withInjectables<Dependencies>(NonInjectedTCPRoutes, {
  getProps: (di, props) => ({ ...props, store: di.inject(tcpRouteStoreInjectable) }),
});
