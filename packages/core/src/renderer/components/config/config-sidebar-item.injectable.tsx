/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { Icon } from "@freelens/icon";
import React from "react";
import { sidebarItemInjectionToken } from "@freelens/cluster-sidebar";
import { noop } from "lodash/fp";

const configSidebarItemInjectable = getInjectable({
  id: "sidebar-item-config",

  instantiate: () => ({
    parentId: null,
    title: "Config",
    getIcon: () => <Icon material="list" />,
    onClick: noop,
    orderNumber: 40,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default configSidebarItemInjectable;
