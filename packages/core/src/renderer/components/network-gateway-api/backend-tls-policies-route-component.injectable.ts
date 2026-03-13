/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import backendTLSPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-tls-policies/backend-tls-policies-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { BackendTLSPolicies } from "./backend-tls-policies";

const backendTLSPoliciesRouteComponentInjectable = getInjectable({
  id: "backend-tls-policies-route-component",

  instantiate: (di) => ({
    route: di.inject(backendTLSPoliciesRouteInjectable),
    Component: BackendTLSPolicies,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default backendTLSPoliciesRouteComponentInjectable;
