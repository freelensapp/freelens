/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import startTrayInjectable from "../electron-tray/start-tray.injectable";
import reactiveTrayMenuItemsInjectable from "./reactive-tray-menu-items.injectable";

const startReactiveTrayMenuItemsInjectable = getInjectable({
  id: "start-reactive-tray-menu-items",

  instantiate: (di) => ({
    run: () => {
      const reactiveTrayMenuItems = di.inject(reactiveTrayMenuItemsInjectable);

      reactiveTrayMenuItems.start();
    },
    runAfter: startTrayInjectable,
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startReactiveTrayMenuItemsInjectable;
