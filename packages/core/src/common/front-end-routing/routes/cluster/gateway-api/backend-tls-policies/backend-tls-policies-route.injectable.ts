/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const backendTlsPoliciesRouteInjectable = getInjectable({
  id: "backend-tls-policies-route",
  instantiate: () => ({ path: "/backend-tls-policies", clusterFrame: true, isEnabled: computed(() => true) }),
  injectionToken: frontEndRouteInjectionToken,
});

export default backendTlsPoliciesRouteInjectable;
