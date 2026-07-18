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
import tlsRouteStoreInjectable from "./tls-route-store.injectable";

import type { TLSRoute } from "@freelensapp/kube-object";

import type { TLSRouteStore } from "./tls-route-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  hostnames = "hostnames",
  parents = "parents",
  age = "age",
}

interface Dependencies {
  store: TLSRouteStore;
}

const NonInjectedTLSRoutes = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_tls_routes"
        className="TLSRoutes"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: TLSRoute) => item.getName(),
          [columnId.namespace]: (item: TLSRoute) => item.getNs(),
          [columnId.age]: (item: TLSRoute) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: TLSRoute) => item.getSearchFields(),
          (item: TLSRoute) => item.getParentNames().join(" "),
          (item: TLSRoute) => item.getHostnames().join(" "),
        ]}
        renderHeaderTitle="TLSRoutes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Hostnames", className: "hostnames", id: columnId.hostnames },
          { title: "Parents", className: "parents", id: columnId.parents },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: TLSRoute) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="hostnames">{item.getHostnames().join(", ") || "-"}</WithTooltip>,
          <WithTooltip key="parents">{item.getParentNames().join(", ") || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const TLSRoutes = withInjectables<Dependencies>(NonInjectedTLSRoutes, {
  getProps: (di, props) => ({ ...props, store: di.inject(tlsRouteStoreInjectable) }),
});
