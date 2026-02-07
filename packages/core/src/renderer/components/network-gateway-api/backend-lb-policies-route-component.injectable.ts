/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import backendLBPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-lb-policies/backend-lb-policies-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { BackendLBPolicies } from "./backend-lb-policies";

const backendLBPoliciesRouteComponentInjectable = getInjectable({
  id: "backend-lb-policies-route-component",

  instantiate: (di) => ({
    route: di.inject(backendLBPoliciesRouteInjectable),
    Component: BackendLBPolicies,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default backendLBPoliciesRouteComponentInjectable;
