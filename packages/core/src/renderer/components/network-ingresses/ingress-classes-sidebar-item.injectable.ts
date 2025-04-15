/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import ingressClassesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/ingress-class/ingress-classes-route.injectable";
import navigateToIngressClassesInjectable from "../../../common/front-end-routing/routes/cluster/network/ingress-class/navigate-to-ingress-classes.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const ingressClassesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-ingress-classes",
  instantiate: (di) => {
    const ingressClassRoute = di.inject(ingressClassesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: "Ingress Classes",
      onClick: di.inject(navigateToIngressClassesInjectable),
      isActive: di.inject(routeIsActiveInjectable, ingressClassRoute),
      isVisible: ingressClassRoute.isEnabled,
      orderNumber: 31,
    };
  },
  injectionToken: sidebarItemInjectionToken,
});

export default ingressClassesSidebarItemInjectable;
