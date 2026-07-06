/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import validatingAdmissionPolicyBindingsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policy-bindings/validating-admission-policy-bindings-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { ValidatingAdmissionPolicyBindings } from "./validating-admission-policy-bindings";

const validatingAdmissionPolicyBindingsRouteComponentInjectable = getInjectable({
  id: "validating-admission-policy-bindings-route-component",

  instantiate: (di) => ({
    route: di.inject(validatingAdmissionPolicyBindingsRouteInjectable),
    Component: ValidatingAdmissionPolicyBindings,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default validatingAdmissionPolicyBindingsRouteComponentInjectable;
