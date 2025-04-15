/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../navigate-to-route-injection-token";
import addClusterRouteInjectable from "./add-cluster-route.injectable";

const navigateToAddClusterInjectable = getInjectable({
  id: "navigate-to-add-cluster",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(addClusterRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToAddClusterInjectable;
