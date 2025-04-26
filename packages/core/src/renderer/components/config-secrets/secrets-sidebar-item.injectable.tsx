/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToSecretsInjectable from "../../../common/front-end-routing/routes/cluster/config/secrets/navigate-to-secrets.injectable";
import secretsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/secrets/secrets-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import configSidebarItemInjectable from "../config/config-sidebar-item.injectable";

const secretsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-secrets",

  instantiate: (di) => {
    const route = di.inject(secretsRouteInjectable);

    return {
      parentId: configSidebarItemInjectable.id,
      title: "Secrets",
      onClick: di.inject(navigateToSecretsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default secretsSidebarItemInjectable;
