/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import tcpRoutesRouteInjectable from "./tcp-routes-route.injectable";

const navigateToTCPRoutesInjectable = getInjectable({
  id: "navigate-to-tcp-routes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(tcpRoutesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToTCPRoutesInjectable;
