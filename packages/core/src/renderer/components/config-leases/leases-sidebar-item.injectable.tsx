/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import leasesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/leases/leases-route.injectable";
import navigateToLeasesInjectable from "../../../common/front-end-routing/routes/cluster/config/leases/navigate-to-leases.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const leasesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-leases",

  instantiate: (di) => {
    const route = di.inject(leasesRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Leases",
      onClick: di.inject(navigateToLeasesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 80,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default leasesSidebarItemInjectable;
