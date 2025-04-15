/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../common/front-end-routing/navigate-to-route-injection-token";
import { navigateToUrlInjectionToken } from "../../common/front-end-routing/navigate-to-url-injection-token";

const navigateToRouteInjectable = getInjectable({
  id: "navigate-to-route",

  instantiate: (di) => {
    const navigateToUrl = di.inject(navigateToUrlInjectionToken);

    return async (route, options) => {
      const url = buildURL(route.path, {
        // TODO: enhance typing
        params: (options as any)?.parameters,
        query: options?.query,
        fragment: options?.fragment,
      });

      await navigateToUrl(url, options);
    };
  },

  injectionToken: navigateToRouteInjectionToken,
});

export default navigateToRouteInjectable;
