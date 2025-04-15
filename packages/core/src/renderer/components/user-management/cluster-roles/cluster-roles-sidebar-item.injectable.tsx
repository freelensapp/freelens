/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import clusterRolesRouteInjectable from "../../../../common/front-end-routing/routes/cluster/user-management/cluster-roles/cluster-roles-route.injectable";
import navigateToClusterRolesInjectable from "../../../../common/front-end-routing/routes/cluster/user-management/cluster-roles/navigate-to-cluster-roles.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import userManagementSidebarItemInjectable from "../user-management-sidebar-item.injectable";

const clusterRolesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-cluster-roles",

  instantiate: (di) => {
    const route = di.inject(clusterRolesRouteInjectable);

    return {
      parentId: userManagementSidebarItemInjectable.id,
      title: "Cluster Roles",
      onClick: di.inject(navigateToClusterRolesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default clusterRolesSidebarItemInjectable;
