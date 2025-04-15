/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToServicesInjectable from "../../../common/front-end-routing/routes/cluster/network/services/navigate-to-services.injectable";
import servicesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/services/services-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const servicesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-services",

  instantiate: (di) => {
    const route = di.inject(servicesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: "Services",
      onClick: di.inject(navigateToServicesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 10,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default servicesSidebarItemInjectable;
