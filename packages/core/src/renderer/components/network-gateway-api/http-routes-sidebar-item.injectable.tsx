/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import httpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/http-routes/http-routes-route.injectable";
import navigateToHTTPRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/http-routes/navigate-to-http-routes.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const httpRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-http-routes",

  instantiate: (di) => {
    const route = di.inject(httpRoutesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          HTTP Routes <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToHTTPRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 34,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default httpRoutesSidebarItemInjectable;
