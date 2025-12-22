/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import clusterOverviewRouteInjectable from "../../../common/front-end-routing/routes/cluster/overview/cluster-overview-route.injectable";
import navigateToClusterOverviewInjectable from "../../../common/front-end-routing/routes/cluster/overview/navigate-to-cluster-overview.injectable";
import { SidebarMenuItem, sidebarMenuItemIds } from "../../../common/sidebar-menu-items-starting-order";
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";

const id = SidebarMenuItem.ClusterOverview;

const clusterOverviewSidebarItemInjectable = getInjectable({
  id: id,

  instantiate: (di) => {
    const title = "Cluster";
    const route = di.inject(clusterOverviewRouteInjectable);
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      title: title,
      getIcon: () => <Icon svg="kube" />,
      onClick: di.inject(navigateToClusterOverviewInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: getClusterPageMenuOrder(id, sidebarMenuItemIds[id]),
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default clusterOverviewSidebarItemInjectable;
