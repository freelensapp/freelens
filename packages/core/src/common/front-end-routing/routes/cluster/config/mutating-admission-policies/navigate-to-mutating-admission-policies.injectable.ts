/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import mutatingAdmissionPoliciesRouteInjectable from "./mutating-admission-policies-route.injectable";

const navigateToMutatingAdmissionPoliciesInjectable = getInjectable({
  id: "navigate-to-mutating-admission-policies",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(mutatingAdmissionPoliciesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToMutatingAdmissionPoliciesInjectable;
