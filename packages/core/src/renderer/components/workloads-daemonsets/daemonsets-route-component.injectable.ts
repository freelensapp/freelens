/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import daemonsetsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/daemonsets/daemonsets-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { DaemonSets } from "./daemonsets";

const daemonsetsRouteComponentInjectable = getInjectable({
  id: "daemonsets-route-component",

  instantiate: (di) => ({
    route: di.inject(daemonsetsRouteInjectable),
    Component: DaemonSets,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default daemonsetsRouteComponentInjectable;
