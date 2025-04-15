/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import leasesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/leases/leases-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Leases } from "./leases";

const leasesRouteComponentInjectable = getInjectable({
  id: "leases-route-component",

  instantiate: (di) => ({
    route: di.inject(leasesRouteInjectable),
    Component: Leases,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default leasesRouteComponentInjectable;
