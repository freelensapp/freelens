/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import udpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/udp-routes/udp-routes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { UDPRoutes } from "./udp-routes";

const udpRoutesRouteComponentInjectable = getInjectable({
  id: "udp-routes-route-component",

  instantiate: (di) => ({
    route: di.inject(udpRoutesRouteInjectable),
    Component: UDPRoutes,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default udpRoutesRouteComponentInjectable;
