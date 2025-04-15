/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import workloadsOverviewRouteInjectable from "./workloads-overview-route.injectable";

const navigateToWorkloadsOverviewInjectable = getInjectable({
  id: "navigate-to-workloads-overview",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(workloadsOverviewRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToWorkloadsOverviewInjectable;
