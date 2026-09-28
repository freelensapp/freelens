/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { computed } from "mobx";
import applicationMenuItemInjectionToken from "./menu-items/application-menu-item-injection-token";

import type { MenuItemConstructorOptions } from "electron";

export interface MenuItemOpts extends MenuItemConstructorOptions {
  submenu?: MenuItemConstructorOptions[];
}

const applicationMenuItemsInjectable = getInjectable({
  id: "application-menu-items",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);

    return computed(() => computedInjectMany(applicationMenuItemInjectionToken).get());
  },
});

export default applicationMenuItemsInjectable;
