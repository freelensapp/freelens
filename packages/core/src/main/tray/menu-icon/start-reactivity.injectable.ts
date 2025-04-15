/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import startTrayInjectable from "../electron-tray/start-tray.injectable";
import reactiveTrayMenuIconInjectable from "./reactive.injectable";

const startReactiveTrayMenuIconInjectable = getInjectable({
  id: "start-reactive-tray-menu-icon",

  instantiate: (di) => ({
    run: () => {
      const reactiveTrayMenuIcon = di.inject(reactiveTrayMenuIconInjectable);

      reactiveTrayMenuIcon.start();
    },

    runAfter: startTrayInjectable,
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startReactiveTrayMenuIconInjectable;
