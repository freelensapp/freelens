/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import grpcRoutesRouteInjectable from "./grpc-routes-route.injectable";

const navigateToGRPCRoutesInjectable = getInjectable({
  id: "navigate-to-grpc-routes",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(grpcRoutesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToGRPCRoutesInjectable;
