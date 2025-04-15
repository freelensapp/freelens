/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { TabId } from "./store";
import dockStoreInjectable from "./store.injectable";

const renameTabInjectable = getInjectable({
  id: "rename-tab",

  instantiate: (di) => {
    const dockStore = di.inject(dockStoreInjectable);

    return (tabId: TabId, title: string): void => {
      dockStore.renameTab(tabId, title);
    };
  },
});

export default renameTabInjectable;
