/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../navigate-to-route-injection-token";
import clusterOverviewRouteInjectable from "./cluster-overview-route.injectable";

const navigateToClusterOverviewInjectable = getInjectable({
  id: "navigate-to-cluster-overview",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(clusterOverviewRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToClusterOverviewInjectable;
