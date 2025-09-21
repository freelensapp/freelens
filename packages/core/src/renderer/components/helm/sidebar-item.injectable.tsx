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

const helmSidebarItemInjectable = getInjectable({
  id: "sidebar-item-helm",

  instantiate: (di) => {
    const title = "Helm";
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      getIcon: () => <Icon svg="helm"/>,
      title: title,
      onClick: noop,
      orderNumber: getClusterPageMenuOrder(title, 90),
    }
  },

  injectionToken: sidebarItemInjectionToken,
});

export default helmSidebarItemInjectable;
