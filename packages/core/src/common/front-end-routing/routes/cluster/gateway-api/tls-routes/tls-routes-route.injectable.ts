/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const tlsRoutesRouteInjectable = getInjectable({
  id: "tls-routes-route",
  instantiate: () => ({ path: "/tls-routes", clusterFrame: true, isEnabled: computed(() => true) }),
  injectionToken: frontEndRouteInjectionToken,
});

export default tlsRoutesRouteInjectable;
