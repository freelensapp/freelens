/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { pipeline } from "@ogre-tools/fp";
import { filter, map } from "lodash/fp";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import { routeSpecificComponentInjectionToken } from "../../renderer/routes/route-specific-component-injection-token";
import { frontEndRouteInjectionToken } from "./front-end-route-injection-token";

describe("verify-that-all-routes-have-component", () => {
  it("verify that routes have route component", () => {
    const rendererDi = getDiForUnitTesting();

    const routes = rendererDi.injectMany(frontEndRouteInjectionToken);
    const routeComponents = rendererDi.injectMany(routeSpecificComponentInjectionToken);

    const routesMissingComponent = pipeline(
      routes,

      map((currentRoute) => ({
        path: currentRoute.path,
        routeComponent: routeComponents.find(
          ({ route }) => route.path === currentRoute.path && route.clusterFrame === currentRoute.clusterFrame,
        ),
      })),

      filter({ routeComponent: undefined }),

      map("path"),
    );

    expect(routesMissingComponent).toEqual([]);
  });
});
