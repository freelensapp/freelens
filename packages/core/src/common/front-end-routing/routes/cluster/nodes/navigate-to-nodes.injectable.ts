/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../navigate-to-route-injection-token";
import nodesRouteInjectable from "./nodes-route.injectable";

const navigateToNodesInjectable = getInjectable({
  id: "navigate-to-nodes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(nodesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToNodesInjectable;
