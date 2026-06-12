/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import endpointSlicesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/endpoint-slices/endpoint-slices-route.injectable";
import navigateToEndpointSlicesInjectable from "../../../common/front-end-routing/routes/cluster/network/endpoint-slices/navigate-to-endpoint-slices.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const endpointSlicesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-endpoint-slices",

  instantiate: (di) => {
    const route = di.inject(endpointSlicesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: "Endpoint Slices",
      onClick: di.inject(navigateToEndpointSlicesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default endpointSlicesSidebarItemInjectable;
