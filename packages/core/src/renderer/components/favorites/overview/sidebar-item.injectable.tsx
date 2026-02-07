/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import favoritesOverviewRouteInjectable from "../../../../common/front-end-routing/routes/cluster/favorites/overview/favorites-overview-route.injectable";
import navigateToFavoritesOverviewInjectable from "../../../../common/front-end-routing/routes/cluster/favorites/overview/navigate-to-favorites-overview.injectable";
import routeIsActiveInjectable from "../../../routes/route-is-active.injectable";
import favoritesSidebarItemInjectable from "../sidebar-item.injectable";

const favoritesOverviewSidebarItemInjectable = getInjectable({
  id: "favorites-overview-sidebar-item",

  instantiate: (di) => {
    const route = di.inject(favoritesOverviewRouteInjectable);

    return {
      parentId: favoritesSidebarItemInjectable.id,
      title: "Overview",
      onClick: di.inject(navigateToFavoritesOverviewInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 10,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default favoritesOverviewSidebarItemInjectable;
