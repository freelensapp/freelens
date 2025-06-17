/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToNetworkPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/network/network-policies/navigate-to-network-policies.injectable";
import networkPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/network-policies/network-policies-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const networkPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-network-policies",

  instantiate: (di) => {
    const route = di.inject(networkPoliciesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: "Network Policies",
      onClick: di.inject(navigateToNetworkPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 40,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default networkPoliciesSidebarItemInjectable;
