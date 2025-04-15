/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import runtimeClassesRouteInjectable from "./runtime-classes-route.injectable";

const navigateToRuntimeClassesInjectable = getInjectable({
  id: "navigate-to-runtime-classes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(runtimeClassesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToRuntimeClassesInjectable;
