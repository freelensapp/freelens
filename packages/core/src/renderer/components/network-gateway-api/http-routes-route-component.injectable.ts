/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import httpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/http-routes/http-routes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { HTTPRoutes } from "./http-routes";

const httpRoutesRouteComponentInjectable = getInjectable({
  id: "http-routes-route-component",

  instantiate: (di) => ({
    route: di.inject(httpRoutesRouteInjectable),
    Component: HTTPRoutes,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default httpRoutesRouteComponentInjectable;
