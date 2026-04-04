/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import React from "react";
import { SidebarMenuItem, sidebarMenuItemIds } from "../../../common/sidebar-menu-items-starting-order";
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";
import { BetaBadge } from "../badge";

let id = SidebarMenuItem.GatewayApi;

const gatewayApiSidebarItemInjectable = getInjectable({
  id: id,

  instantiate: (di) => {
    const title = "Gateway API";
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      getIcon: () => <Icon svg="gateway-api" />,
      title: (
        <span className="BetaBadgeInline">
          {title} <BetaBadge variant="contrast" />
        </span>
      ),
      onClick: noop,
      orderNumber: getClusterPageMenuOrder(id, sidebarMenuItemIds[id]),
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default gatewayApiSidebarItemInjectable;
