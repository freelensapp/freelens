/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import endpointsRouteInjectable from "./endpoints-route.injectable";

const navigateToEndpointsInjectable = getInjectable({
  id: "navigate-to-endpoints",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(endpointsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToEndpointsInjectable;
