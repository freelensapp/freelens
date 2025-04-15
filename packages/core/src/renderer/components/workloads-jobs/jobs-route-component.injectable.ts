/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import jobsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/jobs/jobs-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Jobs } from "./jobs";

const jobsRouteComponentInjectable = getInjectable({
  id: "jobs-route-component",

  instantiate: (di) => ({
    route: di.inject(jobsRouteInjectable),
    Component: Jobs,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default jobsRouteComponentInjectable;
