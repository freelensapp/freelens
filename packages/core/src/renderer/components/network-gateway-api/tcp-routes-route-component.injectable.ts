/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import tcpRoutesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/tcp-routes/tcp-routes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { TCPRoutes } from "./tcp-routes";

const tcpRoutesRouteComponentInjectable = getInjectable({
  id: "tcp-routes-route-component",

  instantiate: (di) => ({
    route: di.inject(tcpRoutesRouteInjectable),
    Component: TCPRoutes,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default tcpRoutesRouteComponentInjectable;
