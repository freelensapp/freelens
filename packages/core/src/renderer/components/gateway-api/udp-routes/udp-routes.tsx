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
import udpRouteStoreInjectable from "./udp-route-store.injectable";

import type { UDPRoute } from "@freelensapp/kube-object";

import type { UDPRouteStore } from "./udp-route-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  parents = "parents",
  age = "age",
}

interface Dependencies {
  store: UDPRouteStore;
}

const NonInjectedUDPRoutes = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_udp_routes"
        className="UDPRoutes"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: UDPRoute) => item.getName(),
          [columnId.namespace]: (item: UDPRoute) => item.getNs(),
          [columnId.age]: (item: UDPRoute) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: UDPRoute) => item.getSearchFields(),
          (item: UDPRoute) => item.getParentNames().join(" "),
        ]}
        renderHeaderTitle="UDPRoutes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Parents", className: "parents", id: columnId.parents },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: UDPRoute) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="parents">{item.getParentNames().join(", ") || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const UDPRoutes = withInjectables<Dependencies>(NonInjectedUDPRoutes, {
  getProps: (di, props) => ({ ...props, store: di.inject(udpRouteStoreInjectable) }),
});
