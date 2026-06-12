/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import navigateToNodesInjectable from "../../../common/front-end-routing/routes/cluster/nodes/navigate-to-nodes.injectable";
import nodesRouteInjectable from "../../../common/front-end-routing/routes/cluster/nodes/nodes-route.injectable";
import { SidebarMenuItem, sidebarMenuItemIds } from "../../../common/sidebar-menu-items-starting-order";
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";

let id = SidebarMenuItem.Nodes;

const nodesSidebarItemInjectable = getInjectable({
  id: id,

  instantiate: (di) => {
    const title = "Nodes";
    const route = di.inject(nodesRouteInjectable);
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      getIcon: () => <Icon svg="nodes" />,
      title: title,
      onClick: di.inject(navigateToNodesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: getClusterPageMenuOrder(id, sidebarMenuItemIds[id]),
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default nodesSidebarItemInjectable;
