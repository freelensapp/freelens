/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import httpRoutesRouteInjectable from "./http-routes-route.injectable";

const navigateToHttpRoutesInjectable = getInjectable({
  id: "navigate-to-http-routes",
  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(httpRoutesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToHttpRoutesInjectable;
