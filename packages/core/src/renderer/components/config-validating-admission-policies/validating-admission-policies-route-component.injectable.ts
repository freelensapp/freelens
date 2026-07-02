/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import validatingAdmissionPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policies/validating-admission-policies-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { ValidatingAdmissionPolicies } from "./validating-admission-policies";

const validatingAdmissionPoliciesRouteComponentInjectable = getInjectable({
  id: "validating-admission-policies-route-component",

  instantiate: (di) => ({
    route: di.inject(validatingAdmissionPoliciesRouteInjectable),
    Component: ValidatingAdmissionPolicies,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default validatingAdmissionPoliciesRouteComponentInjectable;
