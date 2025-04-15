/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToPodsInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/navigate-to-pods.injectable";
import podsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/pods-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import workloadsSidebarItemInjectable from "../workloads/workloads-sidebar-item.injectable";

const podsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-pods",

  instantiate: (di) => {
    const route = di.inject(podsRouteInjectable);

    return {
      parentId: workloadsSidebarItemInjectable.id,
      title: "Pods",
      onClick: di.inject(navigateToPodsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default podsSidebarItemInjectable;
