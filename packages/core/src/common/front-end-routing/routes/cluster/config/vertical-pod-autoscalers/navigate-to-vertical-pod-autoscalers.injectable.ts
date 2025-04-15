/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../../navigate-to-route-injection-token";
import verticalPodAutoscalersRouteInjectable from "./vertical-pod-autoscalers-route.injectable";

const navigateToVerticalPodAutoscalersInjectable = getInjectable({
  id: "navigate-to-vertical-pod-autoscalers",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(verticalPodAutoscalersRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToVerticalPodAutoscalersInjectable;
