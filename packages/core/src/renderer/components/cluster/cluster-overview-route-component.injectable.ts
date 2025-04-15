/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clusterOverviewRouteInjectable from "../../../common/front-end-routing/routes/cluster/overview/cluster-overview-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { ClusterOverview } from "./cluster-overview";

const clusterOverviewRouteComponentInjectable = getInjectable({
  id: "cluster-overview-route-component",

  instantiate: (di) => ({
    route: di.inject(clusterOverviewRouteInjectable),
    Component: ClusterOverview,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default clusterOverviewRouteComponentInjectable;
