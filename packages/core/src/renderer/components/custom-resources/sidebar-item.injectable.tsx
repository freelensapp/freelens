/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { sidebarItemInjectionToken } from "@freelens/cluster-sidebar";
import { noop } from "@freelens/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { Icon } from "@freelens/icon";

const customResourcesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-custom-resources",
  instantiate: () => ({
    parentId: null,
    title: "Custom Resources",
    getIcon: () => <Icon material="extension" />,
    onClick: noop,
    orderNumber: 110,
  }),
  injectionToken: sidebarItemInjectionToken,
});

export default customResourcesSidebarItemInjectable;
