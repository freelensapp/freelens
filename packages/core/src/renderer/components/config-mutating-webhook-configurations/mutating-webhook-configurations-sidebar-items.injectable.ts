/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import mutatingWebhookConfigurationsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-webhook-configurations/mutating-webhook-configurations-route.injectable";
import navigateToMutatingWebhookConfigurationsInjectable from "../../../common/front-end-routing/routes/cluster/config/mutating-webhook-configurations/navigate-to-mutating-webhook-configurations.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const mutatingWebhookConfigurationsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-mutating-webhook-configurations",

  instantiate: (di) => {
    const route = di.inject(mutatingWebhookConfigurationsRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Mutating Webhook Configs",
      onClick: di.inject(navigateToMutatingWebhookConfigurationsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 100,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default mutatingWebhookConfigurationsSidebarItemInjectable;
