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
import gatewayStoreInjectable from "./gateway-store.injectable";

import type { Gateway } from "@freelensapp/kube-object";

import type { GatewayStore } from "./gateway-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  gatewayClass = "gatewayClass",
  listeners = "listeners",
  addresses = "addresses",
  age = "age",
}

interface Dependencies {
  store: GatewayStore;
}

const NonInjectedGateways = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_gateways"
        className="Gateways"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: Gateway) => item.getName(),
          [columnId.namespace]: (item: Gateway) => item.getNs(),
          [columnId.gatewayClass]: (item: Gateway) => item.getGatewayClassName(),
          [columnId.age]: (item: Gateway) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: Gateway) => item.getSearchFields(), (item: Gateway) => item.getGatewayClassName()]}
        renderHeaderTitle="Gateways"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          {
            title: "GatewayClass",
            className: "gatewayClass",
            sortBy: columnId.gatewayClass,
            id: columnId.gatewayClass,
          },
          { title: "Listeners", className: "listeners", id: columnId.listeners },
          { title: "Addresses", className: "addresses", id: columnId.addresses },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: Gateway) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="class">{item.getGatewayClassName()}</WithTooltip>,
          item.getListeners().length,
          <WithTooltip key="addr">{item.getAddresses().join(", ") || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const Gateways = withInjectables<Dependencies>(NonInjectedGateways, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(gatewayStoreInjectable),
  }),
});
