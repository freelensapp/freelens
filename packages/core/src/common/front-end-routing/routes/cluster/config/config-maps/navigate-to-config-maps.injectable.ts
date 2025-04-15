/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import configMapsRouteInjectable from "./config-maps-route.injectable";

const navigateToConfigMapsInjectable = getInjectable({
  id: "navigate-to-config-maps",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(configMapsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToConfigMapsInjectable;
