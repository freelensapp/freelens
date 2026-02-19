/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./udp-routes.scss";

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
import udpRouteStoreInjectable from "./udp-route-store.injectable";

import type { UDPRoute } from "@freelensapp/kube-object";

import type { UDPRouteStore } from "./udp-route-store";

interface Dependencies {
  udpRouteStore: UDPRouteStore;
}

const NonInjectedUDPRoutes = observer((props: Dependencies) => {
  const { udpRouteStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_udp_routes"
        className="UDPRoutes"
        store={udpRouteStore}
        sortingCallbacks={getGatewayApiStreamRouteSortingCallbacks<UDPRoute>()}
        searchFilters={getGatewayApiStreamRouteSearchFilters<UDPRoute>()}
        renderHeaderTitle="UDP Routes"
        renderTableHeader={gatewayApiStreamRouteTableHeaders}
        renderTableContents={(item: UDPRoute) => renderGatewayApiStreamRouteTableContents(item)}
      />
    </SiblingsInTabLayout>
  );
});

export const UDPRoutes = withInjectables<Dependencies>(NonInjectedUDPRoutes, {
  getProps: (di, props) => ({
    ...props,
    udpRouteStore: di.inject(udpRouteStoreInjectable),
  }),
});
