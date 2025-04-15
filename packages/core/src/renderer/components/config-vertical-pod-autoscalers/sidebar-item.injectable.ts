/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToVerticalPodAutoscalersInjectable from "../../../common/front-end-routing/routes/cluster/config/vertical-pod-autoscalers/navigate-to-vertical-pod-autoscalers.injectable";
import verticalPodAutoscalersRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/vertical-pod-autoscalers/vertical-pod-autoscalers-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const verticalPodAutoscalersSidebarItemInjectable = getInjectable({
  id: "sidebar-item-vertical-pod-autoscalers",

  instantiate: (di) => {
    const route = di.inject(verticalPodAutoscalersRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Vertical Pod Autoscalers",
      onClick: di.inject(navigateToVerticalPodAutoscalersInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 50,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default verticalPodAutoscalersSidebarItemInjectable;
