/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./tls-routes.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import {
  gatewayApiTlsRouteTableHeaders,
  getGatewayApiTlsRouteSearchFilters,
  getGatewayApiTlsRouteSortingCallbacks,
  renderGatewayApiTlsRouteTableContents,
} from "./gateway-api-list-helpers";
import tlsRouteStoreInjectable from "./tls-route-store.injectable";

import type { TLSRoute } from "@freelensapp/kube-object";

import type { TLSRouteStore } from "./tls-route-store";

interface Dependencies {
  tlsRouteStore: TLSRouteStore;
}

const NonInjectedTLSRoutes = observer((props: Dependencies) => {
  const { tlsRouteStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_tls_routes"
        className="TLSRoutes"
        store={tlsRouteStore}
        sortingCallbacks={getGatewayApiTlsRouteSortingCallbacks<TLSRoute>()}
        searchFilters={getGatewayApiTlsRouteSearchFilters<TLSRoute>()}
        renderHeaderTitle="TLS Routes"
        renderTableHeader={gatewayApiTlsRouteTableHeaders}
        renderTableContents={(item: TLSRoute) => renderGatewayApiTlsRouteTableContents(item)}
      />
    </SiblingsInTabLayout>
  );
});

export const TLSRoutes = withInjectables<Dependencies>(NonInjectedTLSRoutes, {
  getProps: (di, props) => ({
    ...props,
    tlsRouteStore: di.inject(tlsRouteStoreInjectable),
  }),
});
