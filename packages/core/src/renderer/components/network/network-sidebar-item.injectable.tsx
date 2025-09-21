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
import getClusterPageMenuOrderInjectable
  from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";

const networkSidebarItemInjectable = getInjectable({
  id: "sidebar-item-network",

  instantiate: (di) => {
    const title = "Network";
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      getIcon: () => <Icon material="device_hub"/>,
      title: title,
      onClick: noop,
      orderNumber: getClusterPageMenuOrder(title, 50),
    }
  },

  injectionToken: sidebarItemInjectionToken,
});

export default networkSidebarItemInjectable;
