/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import validatingWebhookConfigurationsRouteInjectable from "./validating-webhook-configurations-route.injectable";

const navigateToValidatingWebhookConfigurationsInjectable = getInjectable({
  id: "navigate-to-validating-webhook-configurations",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(validatingWebhookConfigurationsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToValidatingWebhookConfigurationsInjectable;
