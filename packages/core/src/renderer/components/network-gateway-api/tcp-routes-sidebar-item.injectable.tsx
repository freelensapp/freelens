/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToTCPRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/tcp-routes/navigate-to-tcp-routes.injectable";
import tcpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/tcp-routes/tcp-routes-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "./gateway-api-sidebar-item.injectable";

const tcpRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-tcp-routes",

  instantiate: (di) => {
    const route = di.inject(tcpRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "TCP Routes",
      onClick: di.inject(navigateToTCPRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 37,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default tcpRoutesSidebarItemInjectable;
