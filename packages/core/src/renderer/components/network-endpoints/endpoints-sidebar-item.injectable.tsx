/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import endpointsRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/endpoints/endpoints-route.injectable";
import navigateToEndpointsInjectable from "../../../common/front-end-routing/routes/cluster/network/endpoints/navigate-to-endpoints.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const endpointsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-endpoints",

  instantiate: (di) => {
    const route = di.inject(endpointsRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: "Endpoints",
      onClick: di.inject(navigateToEndpointsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default endpointsSidebarItemInjectable;
