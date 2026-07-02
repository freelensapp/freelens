/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToValidatingAdmissionPolicyBindingsInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policy-bindings/navigate-to-validating-admission-policy-bindings.injectable";
import validatingAdmissionPolicyBindingsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/validating-admission-policy-bindings/validating-admission-policy-bindings-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const validatingAdmissionPolicyBindingsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-validating-admission-policy-bindings",

  instantiate: (di) => {
    const route = di.inject(validatingAdmissionPolicyBindingsRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Validating Admission Policy Bindings",
      onClick: di.inject(navigateToValidatingAdmissionPolicyBindingsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 120,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default validatingAdmissionPolicyBindingsSidebarItemInjectable;
