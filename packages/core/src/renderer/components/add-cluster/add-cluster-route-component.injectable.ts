/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import addClusterRouteInjectable from "../../../common/front-end-routing/routes/add-cluster/add-cluster-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { AddCluster } from "./add-cluster";

const addClusterRouteComponentInjectable = getInjectable({
  id: "add-cluster-route-component",

  instantiate: (di) => ({
    route: di.inject(addClusterRouteInjectable),
    Component: AddCluster,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default addClusterRouteComponentInjectable;
