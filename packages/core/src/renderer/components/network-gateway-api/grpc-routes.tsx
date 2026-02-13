/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./grpc-routes.scss";

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
import grpcRouteStoreInjectable from "./grpc-route-store.injectable";

import type { GRPCRoute } from "@freelensapp/kube-object";

import type { GRPCRouteStore } from "./grpc-route-store";

interface Dependencies {
  grpcRouteStore: GRPCRouteStore;
}

const NonInjectedGRPCRoutes = observer((props: Dependencies) => {
  const { grpcRouteStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_grpc_routes"
        className="GRPCRoutes"
        store={grpcRouteStore}
        sortingCallbacks={getGatewayApiRouteSortingCallbacks<GRPCRoute>()}
        searchFilters={getGatewayApiRouteSearchFilters<GRPCRoute>()}
        renderHeaderTitle="gRPC Routes"
        renderTableHeader={gatewayApiRouteTableHeaders}
        renderTableContents={(item: GRPCRoute) => renderGatewayApiRouteTableContents(item)}
      />
    </SiblingsInTabLayout>
  );
});

export const GRPCRoutes = withInjectables<Dependencies>(NonInjectedGRPCRoutes, {
  getProps: (di, props) => ({
    ...props,
    grpcRouteStore: di.inject(grpcRouteStoreInjectable),
  }),
});
