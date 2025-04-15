import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import React from "react";

const networkSidebarItemInjectable = getInjectable({
  id: "sidebar-item-network",

  instantiate: () => ({
    parentId: null,
    getIcon: () => <Icon material="device_hub" />,
    title: "Network",
    onClick: noop,
    orderNumber: 50,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default networkSidebarItemInjectable;
