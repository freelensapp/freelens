/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const referenceGrantsRouteInjectable = getInjectable({
  id: "reference-grants-route",
  instantiate: () => ({ path: "/reference-grants", clusterFrame: true, isEnabled: computed(() => true) }),
  injectionToken: frontEndRouteInjectionToken,
});

export default referenceGrantsRouteInjectable;
