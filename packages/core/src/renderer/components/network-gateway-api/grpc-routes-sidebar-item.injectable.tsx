/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import grpcRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/grpc-routes/grpc-routes-route.injectable";
import navigateToGRPCRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/grpc-routes/navigate-to-grpc-routes.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const grpcRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-grpc-routes",

  instantiate: (di) => {
    const route = di.inject(grpcRoutesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          gRPC Routes <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToGRPCRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 35,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default grpcRoutesSidebarItemInjectable;
