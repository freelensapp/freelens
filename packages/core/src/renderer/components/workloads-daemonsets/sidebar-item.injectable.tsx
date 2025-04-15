/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import daemonsetsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/daemonsets/daemonsets-route.injectable";
import navigateToDaemonsetsInjectable from "../../../common/front-end-routing/routes/cluster/workloads/daemonsets/navigate-to-daemonsets.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import workloadsSidebarItemInjectable from "../workloads/workloads-sidebar-item.injectable";

const daemonSetsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-daemon-sets",

  instantiate: (di) => {
    const route = di.inject(daemonsetsRouteInjectable);

    return {
      parentId: workloadsSidebarItemInjectable.id,
      title: "Daemon Sets",
      onClick: di.inject(navigateToDaemonsetsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 40,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default daemonSetsSidebarItemInjectable;
