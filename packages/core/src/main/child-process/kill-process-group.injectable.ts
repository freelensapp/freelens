/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

/**
 * Sends `SIGKILL` to every process in the process group led by `pid`. The
 * leader must have been spawned with `detached: true`, which makes its pid the
 * id of a new process group. A group that is already gone is not an error.
 */
export type KillProcessGroup = (pid: number) => void;

const killProcessGroupInjectable = getInjectable({
  id: "kill-process-group",

  instantiate: (): KillProcessGroup => (pid) => {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw error;
      }
    }
  },
  causesSideEffects: true,
});

export default killProcessGroupInjectable;
