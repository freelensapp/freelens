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
import grpcRouteStoreInjectable from "./grpc-route-store.injectable";

import type { GRPCRoute } from "@freelensapp/kube-object";

import type { GRPCRouteStore } from "./grpc-route-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  hostnames = "hostnames",
  parents = "parents",
  age = "age",
}

interface Dependencies {
  store: GRPCRouteStore;
}

const NonInjectedGRPCRoutes = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_grpc_routes"
        className="GRPCRoutes"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: GRPCRoute) => item.getName(),
          [columnId.namespace]: (item: GRPCRoute) => item.getNs(),
          [columnId.age]: (item: GRPCRoute) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: GRPCRoute) => item.getSearchFields(),
          (item: GRPCRoute) => item.getHostnames().join(" "),
          (item: GRPCRoute) => item.getParentNames().join(" "),
        ]}
        renderHeaderTitle="GRPCRoutes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Hostnames", className: "hostnames", id: columnId.hostnames },
          { title: "Parents", className: "parents", id: columnId.parents },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: GRPCRoute) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="hostnames">{item.getHostnames().join(", ") || "*"}</WithTooltip>,
          <WithTooltip key="parents">{item.getParentNames().join(", ") || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const GRPCRoutes = withInjectables<Dependencies>(NonInjectedGRPCRoutes, {
  getProps: (di, props) => ({ ...props, store: di.inject(grpcRouteStoreInjectable) }),
});
