/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import limitRangesRouteInjectable from "./limit-ranges-route.injectable";

const navigateToLimitRangesInjectable = getInjectable({
  id: "navigate-to-limit-ranges",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(limitRangesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToLimitRangesInjectable;
