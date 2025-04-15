/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import configMapsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/config-maps/config-maps-route.injectable";
import navigateToConfigMapsInjectable from "../../../common/front-end-routing/routes/cluster/config/config-maps/navigate-to-config-maps.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const configMapsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-config-maps",

  instantiate: (di) => {
    const route = di.inject(configMapsRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Config Maps",
      onClick: di.inject(navigateToConfigMapsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 10,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default configMapsSidebarItemInjectable;
