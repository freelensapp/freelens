/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { afterApplicationIsLoadedInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import updatingIsEnabledInjectable from "../../updating-is-enabled/main/updating-is-enabled.injectable";
import periodicalCheckForUpdatesInjectable from "./periodical-check-for-updates.injectable";

const startCheckingForUpdatesInjectable = getInjectable({
  id: "start-checking-for-updates",

  instantiate: (di) => ({
    run: () => {
      const periodicalCheckForUpdates = di.inject(periodicalCheckForUpdatesInjectable);
      const updatingIsEnabled = di.inject(updatingIsEnabledInjectable);

      if (updatingIsEnabled && !periodicalCheckForUpdates.started) {
        periodicalCheckForUpdates.start();
      }
    },
  }),

  injectionToken: afterApplicationIsLoadedInjectionToken,
});

export default startCheckingForUpdatesInjectable;
