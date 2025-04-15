/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import leasesRouteInjectable from "./leases-route.injectable";

const navigateToLeasesInjectable = getInjectable({
  id: "navigate-to-leases",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(leasesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToLeasesInjectable;
