/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import mutatingAdmissionPolicyBindingsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-admission-policy-bindings/mutating-admission-policy-bindings-route.injectable";
import navigateToMutatingAdmissionPolicyBindingsInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-admission-policy-bindings/navigate-to-mutating-admission-policy-bindings.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const mutatingAdmissionPolicyBindingsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-mutating-admission-policy-bindings",

  instantiate: (di) => {
    const route = di.inject(mutatingAdmissionPolicyBindingsRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Mutating Admission Policy Bindings",
      onClick: di.inject(navigateToMutatingAdmissionPolicyBindingsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 140,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default mutatingAdmissionPolicyBindingsSidebarItemInjectable;
