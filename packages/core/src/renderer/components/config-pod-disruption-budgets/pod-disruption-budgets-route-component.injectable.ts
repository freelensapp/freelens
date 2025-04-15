/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import podDisruptionBudgetsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/pod-disruption-budgets/pod-disruption-budgets-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { PodDisruptionBudgets } from "./pod-disruption-budgets";

const podDisruptionBudgetsRouteComponentInjectable = getInjectable({
  id: "pod-disruption-budgets-route-component",

  instantiate: (di) => ({
    route: di.inject(podDisruptionBudgetsRouteInjectable),
    Component: PodDisruptionBudgets,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default podDisruptionBudgetsRouteComponentInjectable;
