/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import podsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/pods-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Pods } from "./pods";

const podsRouteComponentInjectable = getInjectable({
  id: "pods-route-component",

  instantiate: (di) => ({
    route: di.inject(podsRouteInjectable),
    Component: Pods,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default podsRouteComponentInjectable;
