/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import helmChartsRouteInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/helm-charts-route.injectable";
import routePathParametersInjectable from "../../routes/route-path-parameters.injectable";

const helmChartsRouteParametersInjectable = getInjectable({
  id: "helm-charts-route-parameters",

  instantiate: (di) => {
    const route = di.inject(helmChartsRouteInjectable);
    const pathParameters = di.inject(routePathParametersInjectable, route);

    return {
      chartName: computed(() => pathParameters.get().chartName),
      repo: computed(() => pathParameters.get().repo),
    };
  },
});

export default helmChartsRouteParametersInjectable;
