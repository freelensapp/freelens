/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../navigate-to-route-injection-token";
import extensionsRouteInjectable from "./extensions-route.injectable";

const navigateToExtensionsInjectable = getInjectable({
  id: "navigate-to-extensions",

  instantiate: (di) => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const route = di.inject(extensionsRouteInjectable);

    return () => navigateToRoute(route);
  },
});

export default navigateToExtensionsInjectable;
