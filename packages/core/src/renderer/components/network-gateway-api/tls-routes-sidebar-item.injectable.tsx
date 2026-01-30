/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToTLSRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/tls-routes/navigate-to-tls-routes.injectable";
import tlsRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/tls-routes/tls-routes-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "./gateway-api-sidebar-item.injectable";

const tlsRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-tls-routes",

  instantiate: (di) => {
    const route = di.inject(tlsRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "TLS Routes",
      onClick: di.inject(navigateToTLSRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 38,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default tlsRoutesSidebarItemInjectable;
