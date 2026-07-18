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
import httpRouteStoreInjectable from "./http-route-store.injectable";

import type { HTTPRoute } from "@freelensapp/kube-object";

import type { HTTPRouteStore } from "./http-route-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  hostnames = "hostnames",
  parents = "parents",
  age = "age",
}

interface Dependencies {
  store: HTTPRouteStore;
}

const NonInjectedHTTPRoutes = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_http_routes"
        className="HTTPRoutes"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: HTTPRoute) => item.getName(),
          [columnId.namespace]: (item: HTTPRoute) => item.getNs(),
          [columnId.age]: (item: HTTPRoute) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: HTTPRoute) => item.getSearchFields(),
          (item: HTTPRoute) => item.getHostnames().join(" "),
          (item: HTTPRoute) => item.getParentNames().join(" "),
        ]}
        renderHeaderTitle="HTTPRoutes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Hostnames", className: "hostnames", id: columnId.hostnames },
          { title: "Parents", className: "parents", id: columnId.parents },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: HTTPRoute) => [
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

export const HTTPRoutes = withInjectables<Dependencies>(NonInjectedHTTPRoutes, {
  getProps: (di, props) => ({ ...props, store: di.inject(httpRouteStoreInjectable) }),
});
