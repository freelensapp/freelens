/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import tlsRoutesRouteInjectable from "./tls-routes-route.injectable";

const navigateToTLSRoutesInjectable = getInjectable({
  id: "navigate-to-tls-routes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(tlsRoutesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToTLSRoutesInjectable;
