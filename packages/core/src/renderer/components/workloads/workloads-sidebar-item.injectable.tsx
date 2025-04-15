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

const workloadsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-workloads",

  instantiate: () => ({
    parentId: null,
    title: "Workloads",
    getIcon: () => <Icon svg="workloads" />,
    onClick: noop,
    orderNumber: 20,
  }),

  injectionToken: sidebarItemInjectionToken,
});

export default workloadsSidebarItemInjectable;
