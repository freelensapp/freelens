/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import secretsRouteInjectable from "./secrets-route.injectable";

const navigateToSecretsInjectable = getInjectable({
  id: "navigate-to-secrets",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(secretsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToSecretsInjectable;
