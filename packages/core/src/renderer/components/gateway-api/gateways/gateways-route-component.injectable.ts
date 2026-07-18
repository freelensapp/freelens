/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import gatewaysRouteInjectable from "../../../../common/front-end-routing/routes/cluster/gateway-api/gateways/gateways-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../../routes/route-specific-component-injection-token";
import { Gateways } from "./gateways";

const gatewaysRouteComponentInjectable = getInjectable({
  id: "gateways-route-component",

  instantiate: (di) => ({
    route: di.inject(gatewaysRouteInjectable),
    Component: Gateways,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default gatewaysRouteComponentInjectable;
