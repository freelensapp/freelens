/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import validatingAdmissionPolicyBindingsRouteInjectable from "./validating-admission-policy-bindings-route.injectable";

const navigateToValidatingAdmissionPolicyBindingsInjectable = getInjectable({
  id: "navigate-to-validating-admission-policy-bindings",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(validatingAdmissionPolicyBindingsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToValidatingAdmissionPolicyBindingsInjectable;
