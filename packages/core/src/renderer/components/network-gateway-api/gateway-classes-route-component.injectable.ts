/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import gatewayClassesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/gateway-classes/gateway-classes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { GatewayClasses } from "./gateway-classes";

const gatewayClassesRouteComponentInjectable = getInjectable({
  id: "gateway-classes-route-component",

  instantiate: (di) => ({
    route: di.inject(gatewayClassesRouteInjectable),
    Component: GatewayClasses,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default gatewayClassesRouteComponentInjectable;
