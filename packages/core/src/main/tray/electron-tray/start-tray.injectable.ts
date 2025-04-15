/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import electronTrayInjectable from "./electron-tray.injectable";

const startTrayInjectable = getInjectable({
  id: "start-tray",

  instantiate: (di) => ({
    run: () => {
      const electronTray = di.inject(electronTrayInjectable);

      electronTray.start();
    },
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startTrayInjectable;
