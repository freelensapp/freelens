/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import mutatingAdmissionPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-admission-policies/mutating-admission-policies-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { MutatingAdmissionPolicies } from "./mutating-admission-policies";

const mutatingAdmissionPoliciesRouteComponentInjectable = getInjectable({
  id: "mutating-admission-policies-route-component",

  instantiate: (di) => ({
    route: di.inject(mutatingAdmissionPoliciesRouteInjectable),
    Component: MutatingAdmissionPolicies,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default mutatingAdmissionPoliciesRouteComponentInjectable;
