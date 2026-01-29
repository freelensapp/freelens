/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import gatewaysRouteInjectable from "./gateways-route.injectable";

const navigateToGatewaysInjectable = getInjectable({
  id: "navigate-to-gateways",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(gatewaysRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToGatewaysInjectable;
