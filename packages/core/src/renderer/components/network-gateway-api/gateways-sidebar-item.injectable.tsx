/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import gatewaysRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/gateways/gateways-route.injectable";
import navigateToGatewaysInjectable from "../../../common/front-end-routing/routes/cluster/network/gateways/navigate-to-gateways.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "./gateway-api-sidebar-item.injectable";

const gatewaysSidebarItemInjectable = getInjectable({
  id: "sidebar-item-gateways",

  instantiate: (di) => {
    const route = di.inject(gatewaysRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "Gateways",
      onClick: di.inject(navigateToGatewaysInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 33,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default gatewaysSidebarItemInjectable;
