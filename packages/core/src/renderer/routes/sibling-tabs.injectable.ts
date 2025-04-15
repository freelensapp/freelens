import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { computed } from "mobx";

const siblingTabsInjectable = getInjectable({
  id: "sibling-tabs",

  instantiate: (di) => {
    const sidebarItems = di.inject(sidebarItemsInjectable);

    return computed(
      () =>
        sidebarItems
          .get()
          .find(({ isActive }) => isActive.get())
          ?.children.filter(({ isVisible }) => isVisible.get()) ?? [],
    );
  },
});

export default siblingTabsInjectable;
