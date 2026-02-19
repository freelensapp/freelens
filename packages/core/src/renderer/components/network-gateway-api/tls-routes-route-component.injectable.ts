/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import tlsRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/tls-routes/tls-routes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { TLSRoutes } from "./tls-routes";

const tlsRoutesRouteComponentInjectable = getInjectable({
  id: "tls-routes-route-component",

  instantiate: (di) => ({
    route: di.inject(tlsRoutesRouteInjectable),
    Component: TLSRoutes,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default tlsRoutesRouteComponentInjectable;
