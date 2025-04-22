/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getStartableStoppable } from "@freelensapp/startable-stoppable";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import type { MinimalTrayMenuItem } from "../electron-tray/electron-tray.injectable";
import electronTrayInjectable from "../electron-tray/electron-tray.injectable";
import type { TrayMenuItem } from "../tray-menu-item/tray-menu-item-injection-token";
import trayMenuItemsInjectable from "../tray-menu-item/tray-menu-items.injectable";

const reactiveTrayMenuItemsInjectable = getInjectable({
  id: "reactive-tray-menu-items",

  instantiate: (di) => {
    const electronTray = di.inject(electronTrayInjectable);
    const reactiveItems = di.inject(trayMenuItemsInjectable);

    return getStartableStoppable("reactive-tray-menu-items", () =>
      reaction(
        () => reactiveItems.get().map(toNonReactiveItem),
        (nonReactiveItems) => electronTray.setMenuItems(nonReactiveItems),
        {
          fireImmediately: true,
        },
      ),
    );
  },
});

export default reactiveTrayMenuItemsInjectable;

const toNonReactiveItem = (item: TrayMenuItem): MinimalTrayMenuItem => ({
  id: item.id,
  parentId: item.parentId,
  click: item.click,
  tooltip: item.tooltip,
  separator: item.separator,
  enabled: item.enabled.get(),
  label: item.label?.get(),
});
