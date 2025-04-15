/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import networkPoliciesRouteInjectable from "./network-policies-route.injectable";

const navigateToNetworkPoliciesInjectable = getInjectable({
  id: "navigate-to-network-policies",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(networkPoliciesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToNetworkPoliciesInjectable;
