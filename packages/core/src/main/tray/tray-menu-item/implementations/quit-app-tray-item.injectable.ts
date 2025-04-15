/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import requestQuitOfAppInjectable from "../../../electron-app/features/require-quit.injectable";
import { trayMenuItemInjectionToken } from "../tray-menu-item-injection-token";

const quitAppTrayItemInjectable = getInjectable({
  id: "quit-app-tray-item",

  instantiate: (di) => ({
    id: "quit-app",
    parentId: null,
    orderNumber: 150,
    label: computed(() => "Quit App"),
    enabled: computed(() => true),
    visible: computed(() => true),
    click: di.inject(requestQuitOfAppInjectable),
  }),

  injectionToken: trayMenuItemInjectionToken,
});

export default quitAppTrayItemInjectable;
