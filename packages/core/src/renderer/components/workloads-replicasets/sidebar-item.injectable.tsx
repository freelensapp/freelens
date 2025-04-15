/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import navigateToReplicasetsInjectable from "../../../common/front-end-routing/routes/cluster/workloads/replicasets/navigate-to-replicasets.injectable";
import replicasetsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/replicasets/replicasets-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import workloadsSidebarItemInjectable from "../workloads/workloads-sidebar-item.injectable";

const replicaSetsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-replica-sets",

  instantiate: (di) => {
    const route = di.inject(replicasetsRouteInjectable);

    return {
      parentId: workloadsSidebarItemInjectable.id,
      title: "Replica Sets",
      onClick: di.inject(navigateToReplicasetsInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 60,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default replicaSetsSidebarItemInjectable;
