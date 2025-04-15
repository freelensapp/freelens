/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { DockTab, DockTabCreate } from "./store";
import dockStoreInjectable from "./store.injectable";

const createDockTabInjectable = getInjectable({
  id: "create-dock-tab",

  instantiate: (di) => {
    const dockStore = di.inject(dockStoreInjectable);

    return (rawTabDesc: DockTabCreate, addNumber?: boolean): DockTab => dockStore.createTab(rawTabDesc, addNumber);
  },
});

export default createDockTabInjectable;
