/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";
import { beforeClusterFrameStartsSecondInjectionToken } from "../../before-frame-starts/tokens";
import customResourceDefinitionGroupsSidebarItemsComputedInjectable from "./groups-sidebar-items-computed.injectable";

import type { Injectable } from "@ogre-tools/injectable";

const customResourceDefinitionGroupsSidebarItemsRegistratorInjectable = getInjectable({
  id: "custom-resource-definition-groups-sidebar-items-registrator",
  instantiate: (di) => ({
    run: () => {
      const sidebarItems = di.inject(customResourceDefinitionGroupsSidebarItemsComputedInjectable);
      const differencingRegistrator = injectableDifferencingRegistratorWith(di);

      // This registrator manages its own previous state
      let previousSidebarItems: Injectable<any, any, any>[] = [];

      reaction(
        // Data function - wrapped in try/catch to prevent error propagation
        () => {
          try {
            const items = sidebarItems.get();
            console.log("[CRD Registrator] Got items:", items.length);
            return items;
          } catch (error) {
            console.error("Error getting sidebar items:", error);
            return []; // Return empty array in case of error
          }
        },
        // Effect - also protected against errors
        (currentItems) => {
          try {
            console.log("[CRD Registrator] Registering items:", currentItems.length, "Previous:", previousSidebarItems.length);
            differencingRegistrator(currentItems, previousSidebarItems);
            previousSidebarItems = currentItems;
            console.log("[CRD Registrator] Registration complete");
          } catch (error) {
            console.error("Error registering sidebar items:", error);
          }
        },
        { fireImmediately: true },
      );
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default customResourceDefinitionGroupsSidebarItemsRegistratorInjectable;
