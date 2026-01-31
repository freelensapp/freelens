/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";
import { computed } from "mobx";

const favoritesOverviewRouteInjectable = getInjectable({
  id: "favorites-overview-route",

  instantiate: () => ({
    path: "/favorites",
    clusterFrame: true,
    isEnabled: computed(() => true),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default favoritesOverviewRouteInjectable;
