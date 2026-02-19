/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import udpRoutesRouteInjectable from "./udp-routes-route.injectable";

const navigateToUDPRoutesInjectable = getInjectable({
  id: "navigate-to-udp-routes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(udpRoutesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToUDPRoutesInjectable;
