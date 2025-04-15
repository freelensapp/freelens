/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import daemonsetsRouteInjectable from "./daemonsets-route.injectable";

const navigateToDaemonsetsInjectable = getInjectable({
  id: "navigate-to-daemonsets",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(daemonsetsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToDaemonsetsInjectable;
