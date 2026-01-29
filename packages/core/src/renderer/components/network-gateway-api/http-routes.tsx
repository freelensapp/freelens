/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./http-routes.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import {
  gatewayApiRouteTableHeaders,
  getGatewayApiRouteSearchFilters,
  getGatewayApiRouteSortingCallbacks,
  renderGatewayApiRouteTableContents,
} from "./gateway-api-list-helpers";
import httpRouteStoreInjectable from "./http-route-store.injectable";

import type { HTTPRoute } from "@freelensapp/kube-object";

import type { HTTPRouteStore } from "./http-route-store";

interface Dependencies {
  httpRouteStore: HTTPRouteStore;
}

const NonInjectedHTTPRoutes = observer((props: Dependencies) => {
  const { httpRouteStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_http_routes"
        className="HTTPRoutes"
        store={httpRouteStore}
        sortingCallbacks={getGatewayApiRouteSortingCallbacks<HTTPRoute>()}
        searchFilters={getGatewayApiRouteSearchFilters<HTTPRoute>()}
        renderHeaderTitle="HTTP Routes"
        renderTableHeader={gatewayApiRouteTableHeaders}
        renderTableContents={(item: HTTPRoute) => renderGatewayApiRouteTableContents(item)}
      />
    </SiblingsInTabLayout>
  );
});

export const HTTPRoutes = withInjectables<Dependencies>(NonInjectedHTTPRoutes, {
  getProps: (di, props) => ({
    ...props,
    httpRouteStore: di.inject(httpRouteStoreInjectable),
  }),
});
