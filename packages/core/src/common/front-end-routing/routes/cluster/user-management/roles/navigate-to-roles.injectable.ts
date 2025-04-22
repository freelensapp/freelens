/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import rolesRouteInjectable from "./roles-route.injectable";

const navigateToRolesInjectable = getInjectable({
  id: "navigate-to-roles",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(rolesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToRolesInjectable;
