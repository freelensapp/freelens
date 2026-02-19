/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import gatewayClassesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/gateway-classes/gateway-classes-route.injectable";
import navigateToGatewayClassesInjectable from "../../../common/front-end-routing/routes/cluster/network/gateway-classes/navigate-to-gateway-classes.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import gatewayApiSidebarItemInjectable from "./gateway-api-sidebar-item.injectable";

const gatewayClassesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-gateway-classes",

  instantiate: (di) => {
    const route = di.inject(gatewayClassesRouteInjectable);

    return {
      parentId: gatewayApiSidebarItemInjectable.id,
      title: "Gateway Classes",
      onClick: di.inject(navigateToGatewayClassesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 32,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default gatewayClassesSidebarItemInjectable;
