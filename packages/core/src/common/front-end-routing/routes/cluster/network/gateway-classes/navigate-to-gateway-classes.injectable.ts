/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import gatewayClassesRouteInjectable from "./gateway-classes-route.injectable";

const navigateToGatewayClassesInjectable = getInjectable({
  id: "navigate-to-gateway-classes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(gatewayClassesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToGatewayClassesInjectable;
