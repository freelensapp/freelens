/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import httpRoutesRouteInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/http-routes/http-routes-route.injectable";
import navigateToHttpRoutesInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/http-routes/navigate-to-http-routes.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "../gateway-api-sidebar-item.injectable";

const httpRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-http-routes",
  instantiate: (di) => {
    const route = di.inject(httpRoutesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "HTTP Routes",
      onClick: di.inject(navigateToHttpRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      orderNumber: 30,
    };
  },
  injectionToken: sidebarItemInjectionToken,
});

export default httpRoutesSidebarItemInjectable;
