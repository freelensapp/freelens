/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import navigateToReferenceGrantsInjectable from "../../../common/front-end-routing/routes/cluster/network/reference-grants/navigate-to-reference-grants.injectable";
import referenceGrantsRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/reference-grants/reference-grants-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import { BetaBadge } from "../badge";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const referenceGrantsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-reference-grants",

  instantiate: (di) => {
    const route = di.inject(referenceGrantsRouteInjectable);

    return {
      parentId: networkSidebarItemInjectable.id,
      title: (
        <span className="BetaBadgeInline">
          Reference Grants <BetaBadge />
        </span>
      ),
      onClick: di.inject(navigateToReferenceGrantsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 36,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default referenceGrantsSidebarItemInjectable;
