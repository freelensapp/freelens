/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import backendTlsPoliciesRouteInjectable from "./backend-tls-policies-route.injectable";

const navigateToBackendTlsPoliciesInjectable = getInjectable({
  id: "navigate-to-backend-tls-policies",
  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(backendTlsPoliciesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToBackendTlsPoliciesInjectable;
