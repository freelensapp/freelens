/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { Route } from "../../common/front-end-routing/front-end-route-injection-token";
import { navigateToUrlInjectionToken } from "../../common/front-end-routing/navigate-to-url-injection-token";
import { navigateToRouteInjectionToken, type NavigateToRouteOptions } from "../../common/front-end-routing/navigate-to-route-injection-token";
import currentlyInClusterFrameInjectable from "./currently-in-cluster-frame.injectable";
import { buildURL } from "@freelensapp/utilities";

const navigateToRouteInjectable = getInjectable({
  id: "navigate-to-route",

  instantiate: (di): (route: Route<unknown>, options?: NavigateToRouteOptions<Route<unknown>>) => void => {
    const navigateToUrl = di.inject(navigateToUrlInjectionToken);

    const currentlyInClusterFrame = di.inject(
      currentlyInClusterFrameInjectable,
    );

    return (route, options) => {
      const url = buildURL(route.path, {
        // TODO: enhance typing
        params: options?.parameters as any,
        query: options?.query,
        fragment: options?.fragment,
      });

      navigateToUrl(url, {
        ...options,
        forceRootFrame: currentlyInClusterFrame && route.clusterFrame === false,
      });
    };
  },

  injectionToken: navigateToRouteInjectionToken,
});

export default navigateToRouteInjectable;
