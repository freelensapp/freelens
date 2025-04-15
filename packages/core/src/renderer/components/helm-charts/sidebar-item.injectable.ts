/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import helmChartsRouteInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/helm-charts-route.injectable";
import navigateToHelmChartsInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/navigate-to-helm-charts.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import helmSidebarItemInjectable from "../helm/sidebar-item.injectable";

const helmChartsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-helm-charts",

  instantiate: (di) => {
    const route = di.inject(helmChartsRouteInjectable);

    return {
      parentId: helmSidebarItemInjectable.id,
      title: "Charts",
      onClick: di.inject(navigateToHelmChartsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 10,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default helmChartsSidebarItemInjectable;
