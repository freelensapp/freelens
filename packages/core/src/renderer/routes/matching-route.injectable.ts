/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { matchPath } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import currentPathInjectable from "./current-path.injectable";
import routesInjectable from "./routes.injectable";

const matchingRouteInjectable = getInjectable({
  id: "matching-route",

  instantiate: (di) => {
    const routes = di.inject(routesInjectable);
    const currentPath = di.inject(currentPathInjectable);

    return computed(() => {
      const matchedRoutes = routes.get().map((route) => {
        const match = matchPath(currentPath.get(), {
          path: route.path,
          exact: true,
        });

        return {
          route,
          isMatching: !!match,
          pathParameters: match ? match.params : {},
        };
      });

      return matchedRoutes.find((matchedRoute) => matchedRoute.isMatching);
    });
  },
});

export default matchingRouteInjectable;
