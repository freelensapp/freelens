/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import navigateToPersistentVolumesInjectable from "../../../common/front-end-routing/routes/cluster/storage/persistent-volumes/navigate-to-persistent-volumes.injectable";
import persistentVolumesRouteInjectable from "../../../common/front-end-routing/routes/cluster/storage/persistent-volumes/persistent-volumes-route.injectable";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import storageSidebarItemInjectable from "../storage/storage-sidebar-item.injectable";

const persistentVolumesSidebarItemInjectable = getInjectable({
  id: "sidebar-item-persistent-volumes",

  instantiate: (di) => {
    const route = di.inject(persistentVolumesRouteInjectable);

    return {
      parentId: storageSidebarItemInjectable.id,
      title: "Persistent Volumes",
      onClick: di.inject(navigateToPersistentVolumesInjectable),
      isActive: di.inject(routeIsActiveInjectable, route),
      isVisible: route.isEnabled,
      orderNumber: 20,
    };
  },

  injectionToken: sidebarItemInjectionToken,
});

export default persistentVolumesSidebarItemInjectable;
