/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clusterRolesRouteInjectable from "../../../../common/front-end-routing/routes/cluster/user-management/cluster-roles/cluster-roles-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../../routes/route-specific-component-injection-token";
import { ClusterRoles } from "./view";

const clusterRolesRouteComponentInjectable = getInjectable({
  id: "cluster-roles-route-component",

  instantiate: (di) => ({
    route: di.inject(clusterRolesRouteInjectable),
    Component: ClusterRoles,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default clusterRolesRouteComponentInjectable;
