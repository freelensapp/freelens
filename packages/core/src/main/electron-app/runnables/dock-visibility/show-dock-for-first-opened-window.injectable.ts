/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { afterWindowIsOpenedInjectionToken } from "../../../start-main-application/runnable-tokens/phases";
import electronAppInjectable from "../../electron-app.injectable";

const showDockForFirstOpenedWindowInjectable = getInjectable({
  id: "show-dock-for-first-opened-window",

  instantiate: (di) => ({
    run: () => {
      const app = di.inject(electronAppInjectable);

      app.dock?.show();
    },
  }),

  injectionToken: afterWindowIsOpenedInjectionToken,
});

export default showDockForFirstOpenedWindowInjectable;
