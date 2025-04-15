/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import workloadsOverviewRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/overview/workloads-overview-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { WorkloadsOverview } from "./overview";

const workloadsOverviewRouteComponentInjectable = getInjectable({
  id: "workloads-overview-route-component",

  instantiate: (di) => ({
    route: di.inject(workloadsOverviewRouteInjectable),
    Component: WorkloadsOverview,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default workloadsOverviewRouteComponentInjectable;
