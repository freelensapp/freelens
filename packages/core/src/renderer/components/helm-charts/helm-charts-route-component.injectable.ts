/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import helmChartsRouteInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/helm-charts-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { HelmCharts } from "./helm-charts";

const helmChartsRouteComponentInjectable = getInjectable({
  id: "helm-charts-route-component",

  instantiate: (di) => ({
    route: di.inject(helmChartsRouteInjectable),
    Component: HelmCharts,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default helmChartsRouteComponentInjectable;
