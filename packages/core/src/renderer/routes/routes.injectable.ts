/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import { frontEndRouteInjectionToken } from "../../common/front-end-routing/front-end-route-injection-token";
import currentlyInClusterFrameInjectable from "./currently-in-cluster-frame.injectable";

const routesInjectable = getInjectable({
  id: "routes",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const currentlyInClusterFrame = di.inject(currentlyInClusterFrameInjectable);
    const routes = computedInjectMany(frontEndRouteInjectionToken);

    return computed(() =>
      routes
        .get()
        .filter((route) => route.clusterFrame === currentlyInClusterFrame)
        .filter((route) => route.isEnabled.get()),
    );
  },
});

export default routesInjectable;
