import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { noop } from "lodash/fp";
import React from "react";

const storageSidebarItemInjectable = getInjectable({
  id: "sidebar-item-storage",

  instantiate: () => ({
    parentId: null,
    getIcon: () => <Icon material="storage" />,
    title: "Storage",
    onClick: noop,
    orderNumber: 60,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default storageSidebarItemInjectable;
