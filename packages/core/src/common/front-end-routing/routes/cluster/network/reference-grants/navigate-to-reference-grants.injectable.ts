/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import referenceGrantsRouteInjectable from "./reference-grants-route.injectable";

const navigateToReferenceGrantsInjectable = getInjectable({
  id: "navigate-to-reference-grants",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(referenceGrantsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToReferenceGrantsInjectable;
