/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import mutatingAdmissionPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-admission-policies/mutating-admission-policies-route.injectable";
import navigateToMutatingAdmissionPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-admission-policies/navigate-to-mutating-admission-policies.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const mutatingAdmissionPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-mutating-admission-policies",

  instantiate: (di) => {
    const route = di.inject(mutatingAdmissionPoliciesRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Mutating Admission Policies",
      onClick: di.inject(navigateToMutatingAdmissionPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 130,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default mutatingAdmissionPoliciesSidebarItemInjectable;
