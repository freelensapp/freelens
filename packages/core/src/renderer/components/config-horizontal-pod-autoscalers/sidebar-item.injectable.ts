/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import horizontalPodAutoscalersRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/horizontal-pod-autoscalers/horizontal-pod-autoscalers-route.injectable";
import navigateToHorizontalPodAutoscalersInjectable from "../../../common/front-end-routing/routes/cluster/config/horizontal-pod-autoscalers/navigate-to-horizontal-pod-autoscalers.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const horizontalPodAutoscalersSidebarItemInjectable = getInjectable({
  id: "sidebar-item-horizontal-pod-autoscalers",

  instantiate: (di) => {
    const route = di.inject(horizontalPodAutoscalersRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Horizontal Pod Autoscalers",
      onClick: di.inject(navigateToHorizontalPodAutoscalersInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 50,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default horizontalPodAutoscalersSidebarItemInjectable;
