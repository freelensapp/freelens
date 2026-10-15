/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

export interface ShellSyncStartupFailure {
  set: (error: string) => void;
  take: () => string | undefined;
}

// Shell sync runs at startup before any window that could show its failure
// exists, so the failure is kept here until the application renderer is ready.
const shellSyncStartupFailureInjectable = getInjectable({
  id: "shell-sync-startup-failure",

  instantiate: (): ShellSyncStartupFailure => {
    let pendingError: string | undefined;

    return {
      set: (error) => {
        pendingError = error;
      },

      take: () => {
        const error = pendingError;

        pendingError = undefined;

        return error;
      },
    };
  },
});

export default shellSyncStartupFailureInjectable;
