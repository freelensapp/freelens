/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../../utils/create-storage/create-storage.injectable";

export type SidebarItemsOrder = {
  [key: string]: number;
};

export interface SidebarStorageState {
  width: number;
  expanded: {
    [itemId: string]: boolean;
  };
  order: SidebarItemsOrder
}

export const defaultSidebarWidth = 200;

const sidebarStorageInjectable = getInjectable({
  id: "sidebar-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage("sidebar", {
      width: defaultSidebarWidth,
      expanded: {},
      order: {}
    });
  },
});

export default sidebarStorageInjectable;
