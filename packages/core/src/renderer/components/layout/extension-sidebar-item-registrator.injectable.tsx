/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import { matches } from "lodash/fp";
import { computed } from "mobx";
import React from "react";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { getExtensionRoutePath } from "../../routes/for-extension";
import routeIsActiveInjectable from "../../routes/route-is-active.injectable";
import routesInjectable from "../../routes/routes.injectable";

import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import getClusterPageMenuOrderInjectable
  from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";

const extensionSidebarItemRegistratorInjectable = getInjectable({
  id: "extension-sidebar-item-registrator",

  instantiate: (di) => (ext) => {
    const extension = ext as LensRendererExtension;
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const getClusterPageMenuOrder = di.inject(getClusterPageMenuOrderInjectable);
    const routes = di.inject(routesInjectable);
    const extensionShouldBeEnabledForClusterFrame = di.inject(
      extensionShouldBeEnabledForClusterFrameInjectable,
      extension,
    );
    const extensionRoutes = computed(() => routes.get().filter(matches({ extension })));

    return computed(() =>
      extension.clusterPageMenus.map((registration) => {
        const {
          components,
          title,
          parentId: rawParentId,
          visible,
          id: rawId,
          target,
        } = registration;
        const orderNumber = getClusterPageMenuOrder(extension.name, 9999);
        const id = rawId
          ? `sidebar-item-${extension.sanitizedExtensionId}-${rawId}`
          : `sidebar-item-${extension.sanitizedExtensionId}`;
        const parentId = rawParentId ? `sidebar-item-${extension.sanitizedExtensionId}-${rawParentId}` : null;
        const targetRoutePath = getExtensionRoutePath(extension, target?.pageId);
        const targetRoute = computed(() => extensionRoutes.get().find(matches({ path: targetRoutePath })));

        return getInjectable({
          id,
          instantiate: () => ({
            orderNumber,
            parentId,
            isVisible: computed(() => extensionShouldBeEnabledForClusterFrame.value.get() && (visible?.get() ?? true)),
            title,
            getIcon: () => components.Icon && <components.Icon />,
            onClick: () => {
              const route = targetRoute.get();

              if (route) {
                navigateToRoute(route);
              }
            },
            isActive: computed(() => {
              const route = targetRoute.get();

              if (!route) {
                return false;
              }

              return di.inject(routeIsActiveInjectable, route).get();
            }),
          }),
          injectionToken: sidebarItemInjectionToken,
        });
      }),
    );
  },

  injectionToken: extensionRegistratorInjectionToken,
});

export default extensionSidebarItemRegistratorInjectable;
