/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import grpcRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/grpc-routes/grpc-routes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { GRPCRoutes } from "./grpc-routes";

const grpcRoutesRouteComponentInjectable = getInjectable({
  id: "grpc-routes-route-component",

  instantiate: (di) => ({
    route: di.inject(grpcRoutesRouteInjectable),
    Component: GRPCRoutes,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default grpcRoutesRouteComponentInjectable;
