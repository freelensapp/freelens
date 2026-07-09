/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToValidatingAdmissionPoliciesInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policies/navigate-to-validating-admission-policies.injectable";
import validatingAdmissionPoliciesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policies/validating-admission-policies-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const validatingAdmissionPoliciesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-validating-admission-policies",

  instantiate: (di) => {
    const route = di.inject(validatingAdmissionPoliciesRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Validating Admission Policies",
      onClick: di.inject(navigateToValidatingAdmissionPoliciesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 110,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default validatingAdmissionPoliciesSidebarItemInjectable;
