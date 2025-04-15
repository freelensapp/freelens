/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import replicationControllersRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/replication-controllers/route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { ReplicationControllers } from "./replication-controllers";

const replicationControllersRouteComponentInjectable = getInjectable({
  id: "replication-controller-route-component",

  instantiate: (di) => ({
    route: di.inject(replicationControllersRouteInjectable),
    Component: ReplicationControllers,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default replicationControllersRouteComponentInjectable;
