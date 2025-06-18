/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToPriorityClassesInjectable from "../../../common/front-end-routing/routes/cluster/config/priority-classes/navigate-to-priority-classes.injectable";
import priorityClassesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/priority-classes/priority-classes-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const priorityClassesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-priority-classes",

  instantiate: (di) => {
    const route = di.inject(priorityClassesRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Priority Classes",
      onClick: di.inject(navigateToPriorityClassesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 70,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default priorityClassesSidebarItemInjectable;
