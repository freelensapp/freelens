/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./gateways.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { LinkToObject } from "../kube-object-link";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import { GatewayColumnId, gatewayTableHeaders } from "./gateway-api-list-helpers";
import { getGatewayApiVersion } from "./gateway-api-version";
import gatewayStoreInjectable from "./gateway-store.injectable";

import type { Gateway } from "@freelensapp/kube-object";

import type { GatewayStore } from "./gateway-store";

interface Dependencies {
  gatewayStore: GatewayStore;
}

const renderGatewayClassLink = (gateway: Gateway) => {
  const className = gateway.getClassName();

  if (!className) {
    return "-";
  }

  return (
    <WithTooltip tooltip={className}>
      <LinkToObject
        object={gateway}
        objectRef={{
          kind: "GatewayClass",
          name: className,
          apiVersion: getGatewayApiVersion(gateway),
        }}
      />
    </WithTooltip>
  );
};

const NonInjectedGateways = observer((props: Dependencies) => {
  const { gatewayStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_gateways"
        className="Gateways"
        store={gatewayStore}
        sortingCallbacks={{
          [GatewayColumnId.name]: (item: Gateway) => item.getName(),
          [GatewayColumnId.namespace]: (item: Gateway) => item.getNs(),
          [GatewayColumnId.class]: (item: Gateway) => item.getClassName(),
          [GatewayColumnId.age]: (item: Gateway) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: Gateway) => item.getSearchFields()]}
        renderHeaderTitle="Gateways"
        renderTableHeader={gatewayTableHeaders}
        renderTableContents={(item: Gateway) => {
          const addresses = item.getAddresses();
          const listeners = item.getListeners();

          const addressesLabel = addresses.length > 0 ? addresses.join(", ") : "-";
          const listenersLabel = listeners.length > 0 ? `${listeners.length} listener(s)` : "-";

          return [
            <WithTooltip>{item.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
            renderGatewayClassLink(item),
            <WithTooltip tooltip={addressesLabel}>{addressesLabel}</WithTooltip>,
            <WithTooltip tooltip={listenersLabel}>{listenersLabel}</WithTooltip>,
            <KubeObjectStatusIcon key="ready" object={item} />,
            <KubeObjectAge key="age" object={item} />,
          ];
        }}
      />
    </SiblingsInTabLayout>
  );
});

export const Gateways = withInjectables<Dependencies>(NonInjectedGateways, {
  getProps: (di, props) => ({
    ...props,
    gatewayStore: di.inject(gatewayStoreInjectable),
  }),
});
