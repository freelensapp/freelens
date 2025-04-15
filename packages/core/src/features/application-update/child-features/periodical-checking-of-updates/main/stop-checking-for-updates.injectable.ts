/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { onQuitOfBackEndInjectionToken } from "../../../../../main/start-main-application/runnable-tokens/phases";
import periodicalCheckForUpdatesInjectable from "./periodical-check-for-updates.injectable";

const stopCheckingForUpdatesInjectable = getInjectable({
  id: "stop-checking-for-updates",

  instantiate: (di) => ({
    run: () => {
      const periodicalCheckForUpdates = di.inject(periodicalCheckForUpdatesInjectable);

      if (periodicalCheckForUpdates.started) {
        periodicalCheckForUpdates.stop();
      }

      return undefined;
    },
  }),

  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopCheckingForUpdatesInjectable;
