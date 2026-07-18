/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToUdpRoutesInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/udp-routes/navigate-to-udp-routes.injectable";
import udpRoutesRouteInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/udp-routes/udp-routes-route.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "../gateway-api-sidebar-item.injectable";

const udpRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-udp-routes",
  instantiate: (di) => {
    const route = di.inject(udpRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "UDP Routes",
      onClick: di.inject(navigateToUdpRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      orderNumber: 90,
    };
  },
  injectionToken: sidebarItemInjectionToken,
});

export default udpRoutesSidebarItemInjectable;
