/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./tcp-routes.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import {
  gatewayApiStreamRouteTableHeaders,
  getGatewayApiStreamRouteSearchFilters,
  getGatewayApiStreamRouteSortingCallbacks,
  renderGatewayApiStreamRouteTableContents,
} from "./gateway-api-list-helpers";
import tcpRouteStoreInjectable from "./tcp-route-store.injectable";

import type { TCPRoute } from "@freelensapp/kube-object";

import type { TCPRouteStore } from "./tcp-route-store";

interface Dependencies {
  tcpRouteStore: TCPRouteStore;
}

const NonInjectedTCPRoutes = observer((props: Dependencies) => {
  const { tcpRouteStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_tcp_routes"
        className="TCPRoutes"
        store={tcpRouteStore}
        sortingCallbacks={getGatewayApiStreamRouteSortingCallbacks<TCPRoute>()}
        searchFilters={getGatewayApiStreamRouteSearchFilters<TCPRoute>()}
        renderHeaderTitle="TCP Routes"
        renderTableHeader={gatewayApiStreamRouteTableHeaders}
        renderTableContents={(item: TCPRoute) => renderGatewayApiStreamRouteTableContents(item)}
      />
    </SiblingsInTabLayout>
  );
});

export const TCPRoutes = withInjectables<Dependencies>(NonInjectedTCPRoutes, {
  getProps: (di, props) => ({
    ...props,
    tcpRouteStore: di.inject(tcpRouteStoreInjectable),
  }),
});
