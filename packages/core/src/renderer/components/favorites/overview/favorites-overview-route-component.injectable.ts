/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import favoritesOverviewRouteInjectable from "../../../../common/front-end-routing/routes/cluster/favorites/overview/favorites-overview-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../../routes/route-specific-component-injection-token";
import { FavoritesOverview } from "./overview";

const favoritesOverviewRouteComponentInjectable = getInjectable({
  id: "favorites-overview-route-component",

  instantiate: (di) => ({
    route: di.inject(favoritesOverviewRouteInjectable),
    Component: FavoritesOverview,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default favoritesOverviewRouteComponentInjectable;
