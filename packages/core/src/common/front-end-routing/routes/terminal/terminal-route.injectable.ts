/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { frontEndRouteInjectionToken } from "../../front-end-route-injection-token";

/**
 * The terminal page lives in the root frame: its shells belong to no cluster,
 * so it must be reachable without connecting to one.
 */
const terminalRouteInjectable = getInjectable({
  id: "terminal-route",

  instantiate: () => ({
    path: "/terminal",
    clusterFrame: false,
    isEnabled: computed(() => true),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default terminalRouteInjectable;
