/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import React from "react";
import networkSidebarItemInjectable from "../network/network-sidebar-item.injectable";

const gatewayApiSidebarItemInjectable = getInjectable({
  id: "sidebar-item-gateway-api",

  instantiate: () => ({
    parentId: networkSidebarItemInjectable.id,
    getIcon: () => <Icon material="hub" />,
    title: "Gateway API",
    onClick: noop,
    orderNumber: 60,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default gatewayApiSidebarItemInjectable;
