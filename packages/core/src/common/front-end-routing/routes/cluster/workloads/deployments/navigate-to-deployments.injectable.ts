/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import deploymentsRouteInjectable from "./deployments-route.injectable";

const navigateToDeploymentsInjectable = getInjectable({
  id: "navigate-to-deployments",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(deploymentsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToDeploymentsInjectable;
