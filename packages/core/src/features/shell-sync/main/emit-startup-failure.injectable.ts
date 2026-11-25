/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { afterRootFrameIsReadyInjectionToken } from "../../../main/start-main-application/runnable-tokens/phases";
import emitShellSyncFailedInjectable from "./emit-failure.injectable";
import shellSyncStartupFailureInjectable from "./startup-failure.injectable";

// The root frame reports that it has rendered only after the renderer has
// started listening to channels, so the failure is not lost. The phase runs
// again on every renderer reload; taking the failure delivers it only once.
const emitShellSyncStartupFailureInjectable = getInjectable({
  id: "emit-shell-sync-startup-failure",

  instantiate: (di) => ({
    run: () => {
      const shellSyncStartupFailure = di.inject(shellSyncStartupFailureInjectable);
      const emitShellSyncFailed = di.inject(emitShellSyncFailedInjectable);

      const error = shellSyncStartupFailure.take();

      if (error !== undefined) {
        emitShellSyncFailed(error);
      }
    },
  }),

  injectionToken: afterRootFrameIsReadyInjectionToken,
});

export default emitShellSyncStartupFailureInjectable;
