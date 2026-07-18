/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import grpcRoutesRouteInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/grpc-routes/grpc-routes-route.injectable";
import navigateToGrpcRoutesInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/grpc-routes/navigate-to-grpc-routes.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "../gateway-api-sidebar-item.injectable";

const grpcRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-grpc-routes",
  instantiate: (di) => {
    const route = di.inject(grpcRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "gRPC Routes",
      onClick: di.inject(navigateToGrpcRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      orderNumber: 50,
    };
  },
  injectionToken: sidebarItemInjectionToken,
});

export default grpcRoutesSidebarItemInjectable;
