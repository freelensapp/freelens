/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import backendTLSPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-tls-policies/backend-tls-policies-route.injectable";
import navigateToBackendTLSPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/network/backend-tls-policies/navigate-to-backend-tls-policies.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const backendTLSPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-backend-tls-policies",

  instantiate: (di) => {
    const route = di.inject(backendTLSPoliciesRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          Backend TLS Policies <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToBackendTLSPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 40,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default backendTLSPoliciesSidebarItemInjectable;
