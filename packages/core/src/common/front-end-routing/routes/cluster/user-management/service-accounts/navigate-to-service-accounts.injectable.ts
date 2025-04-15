/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import serviceAccountsRouteInjectable from "./service-accounts-route.injectable";

const navigateToServiceAccountsInjectable = getInjectable({
  id: "navigate-to-service-accounts",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(serviceAccountsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToServiceAccountsInjectable;
