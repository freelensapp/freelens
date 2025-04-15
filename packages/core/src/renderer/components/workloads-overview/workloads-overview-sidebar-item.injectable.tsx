/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToWorkloadsOverviewInjectable from "../../../common/front-end-routing/routes/cluster/workloads/overview/navigate-to-workloads-overview.injectable";
import workloadsOverviewRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/overview/workloads-overview-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import workloadsSidebarItemInjectable from "../workloads/workloads-sidebar-item.injectable";

const workloadsOverviewSidebarItemInjectable = getInjectable({
  id: "sidebar-item-workloads-overview",

  instantiate: (di) => {
    const route = di.inject(workloadsOverviewRouteInjectable);

    return {
      parentId: workloadsSidebarItemInjectable.id,
      title: "Overview",
      onClick: di.inject(navigateToWorkloadsOverviewInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 10,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default workloadsOverviewSidebarItemInjectable;
