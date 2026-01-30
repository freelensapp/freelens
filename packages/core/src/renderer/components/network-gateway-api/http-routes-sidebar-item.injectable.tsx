/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import httpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/http-routes/http-routes-route.injectable";
import navigateToHTTPRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/http-routes/navigate-to-http-routes.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "./gateway-api-sidebar-item.injectable";

const httpRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-http-routes",

  instantiate: (di) => {
    const route = di.inject(httpRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "HTTP Routes",
      onClick: di.inject(navigateToHTTPRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 34,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default httpRoutesSidebarItemInjectable;
