/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import validatingAdmissionPoliciesRouteInjectable from "./validating-admission-policies-route.injectable";

const navigateToValidatingAdmissionPoliciesInjectable = getInjectable({
  id: "navigate-to-validating-admission-policies",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(validatingAdmissionPoliciesRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToValidatingAdmissionPoliciesInjectable;
