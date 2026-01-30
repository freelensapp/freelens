/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import backendLBPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-lb-policies/backend-lb-policies-route.injectable";
import navigateToBackendLBPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-lb-policies/navigate-to-backend-lb-policies.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const backendLBPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-backend-lb-policies",

  instantiate: (di) => {
    const route = di.inject(backendLBPoliciesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          Backend LB Policies <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToBackendLBPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 41,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default backendLBPoliciesSidebarItemInjectable;
