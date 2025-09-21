/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { Icon } from "@freelensapp/icon";
import { noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import getClusterPageMenuOrderInjectable
  from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";

const customResourcesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-custom-resources",

  instantiate: (di) => {
    const title = "Custom Resources";
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      title: title,
      getIcon: () => <Icon material="extension"/>,
      onClick: noop,
      orderNumber: getClusterPageMenuOrder(title, 110),
    }
  },
  injectionToken: sidebarItemInjectionToken,
});

export default customResourcesSidebarItemInjectable;
