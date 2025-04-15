/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToPodSecurityPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/user-management/pod-security-policies/navigate-to-pod-security-policies.injectable";
import podSecurityPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/user-management/pod-security-policies/pod-security-policies-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import userManagementSidebarItemInjectable from "../user-management/user-management-sidebar-item.injectable";

const podSecurityPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-pod-security-policies",

  instantiate: (di) => {
    const route = di.inject(podSecurityPoliciesRouteInjectable);

    return {
      parentId: userManagementSidebarItemInjectable.id,
      title: "Pod Security Policies",
      onClick: di.inject(navigateToPodSecurityPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 60,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default podSecurityPoliciesSidebarItemInjectable;
