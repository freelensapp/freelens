/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToRoleBindingsInjectable from "../../../../common/front-end-routing/routes/cluster/user-management/role-bindings/navigate-to-role-bindings.injectable";
import roleBindingsRouteInjectable from "../../../../common/front-end-routing/routes/cluster/user-management/role-bindings/role-bindings-route.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import userManagementSidebarItemInjectable from "../user-management-sidebar-item.injectable";

const roleBindingsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-role-bindings",

  instantiate: (di) => {
    const route = di.inject(roleBindingsRouteInjectable);

    return {
      parentId: userManagementSidebarItemInjectable.id,
      title: "Role Bindings",
      onClick: di.inject(navigateToRoleBindingsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 50,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default roleBindingsSidebarItemInjectable;
