/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import navigateToTLSRoutesInjectable from "../../../common/front-end-routing/routes/cluster/network/tls-routes/navigate-to-tls-routes.injectable";
import tlsRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/tls-routes/tls-routes-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const tlsRoutesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-tls-routes",

  instantiate: (di) => {
    const route = di.inject(tlsRoutesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          TLS Routes <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToTLSRoutesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 38,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default tlsRoutesSidebarItemInjectable;
