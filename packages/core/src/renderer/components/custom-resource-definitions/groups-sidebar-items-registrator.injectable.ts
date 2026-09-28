/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import dependencyInjectionContainerInjectable from "../../../common/dependency-injection/dependency-injection-container.injectable";
import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";
import { beforeClusterFrameStartsSecondInjectionToken } from "../../before-frame-starts/tokens";
import customResourceDefinitionGroupsSidebarItemsComputedInjectable from "./groups-sidebar-items-computed.injectable";

const customResourceDefinitionGroupsSidebarItemsRegistratorInjectable = getInjectable({
  id: "custom-resource-definition-groups-sidebar-items-registrator",
  instantiate: (di) => ({
    run: () => {
      const sidebarItems = di.inject(customResourceDefinitionGroupsSidebarItemsComputedInjectable);
      // Register against the root container so the sidebar item ids stay bare
      // (not namespaced under this registrator by @ogre-tools 23).
      const injectableDifferencingRegistrator = injectableDifferencingRegistratorWith(
        di.inject(dependencyInjectionContainerInjectable),
      );

      reaction(() => sidebarItems.get(), injectableDifferencingRegistrator, { fireImmediately: true });
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default customResourceDefinitionGroupsSidebarItemsRegistratorInjectable;
