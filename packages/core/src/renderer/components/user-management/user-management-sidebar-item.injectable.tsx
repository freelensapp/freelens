import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import React from "react";

const userManagementSidebarItemInjectable = getInjectable({
  id: "sidebar-item-user-management",

  instantiate: () => ({
    parentId: null,
    getIcon: () => <Icon material="security" />,
    title: "Access Control",
    onClick: noop,
    orderNumber: 100,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default userManagementSidebarItemInjectable;
