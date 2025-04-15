/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import cronJobsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/cron-jobs/cron-jobs-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { CronJobs } from "./cronjobs";

const cronJobsRouteComponentInjectable = getInjectable({
  id: "cron-jobs-route-component",

  instantiate: (di) => ({
    route: di.inject(cronJobsRouteInjectable),
    Component: CronJobs,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default cronJobsRouteComponentInjectable;
