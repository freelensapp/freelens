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
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";

let id = "sidebar-item-workloads";

const workloadsSidebarItemInjectable = getInjectable({
  id: id,

  instantiate: (di) => {
    const title = "Workloads";
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);

    return {
      parentId: null,
      title: title,
      getIcon: () => <Icon svg="workloads" />,
      onClick: noop,
      orderNumber: getClusterPageMenuOrder(id, 30),
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default workloadsSidebarItemInjectable;
