/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { sortBy } from "es-toolkit";
import { computed } from "mobx";
import { trayMenuItemInjectionToken } from "./tray-menu-item-injection-token";

const trayMenuItemsInjectable = getInjectable({
  id: "tray-menu-items",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);

    const reactiveMenuItems = computedInjectMany(trayMenuItemInjectionToken);

    return computed(() =>
      sortBy(
        reactiveMenuItems.get().filter((item) => item.visible.get()),
        ["orderNumber"],
      ),
    );
  },
});

export default trayMenuItemsInjectable;
