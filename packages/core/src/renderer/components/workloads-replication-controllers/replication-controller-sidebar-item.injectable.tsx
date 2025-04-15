/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToReplicationControllersInjectable from "../../../common/front-end-routing/routes/cluster/workloads/replication-controllers/navigate-to.injectable";
import replicationControllersRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/replication-controllers/route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import workloadsSidebarItemInjectable from "../workloads/workloads-sidebar-item.injectable";

const replicationControllerSidebarItemInjectable = getInjectable({
  id: "sidebar-item-replication-controller",

  instantiate: (di) => {
    const route = di.inject(replicationControllersRouteInjectable);

    return {
      parentId: workloadsSidebarItemInjectable.id,
      title: "Replication Controllers",
      onClick: di.inject(navigateToReplicationControllersInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 61,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default replicationControllerSidebarItemInjectable;
