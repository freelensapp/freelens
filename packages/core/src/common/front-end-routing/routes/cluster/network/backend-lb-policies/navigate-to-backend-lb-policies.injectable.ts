/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import backendLBPoliciesRouteInjectable from "./backend-lb-policies-route.injectable";

const navigateToBackendLBPoliciesInjectable = getInjectable({
  id: "navigate-to-backend-lb-policies",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(backendLBPoliciesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToBackendLBPoliciesInjectable;
