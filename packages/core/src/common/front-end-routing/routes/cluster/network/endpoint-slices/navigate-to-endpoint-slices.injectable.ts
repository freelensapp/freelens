/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import endpointSlicesRouteInjectable from "./endpoint-slices-route.injectable";

const navigateToEndpointSlicesInjectable = getInjectable({
  id: "navigate-to-endpoint-slices",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(endpointSlicesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToEndpointSlicesInjectable;
