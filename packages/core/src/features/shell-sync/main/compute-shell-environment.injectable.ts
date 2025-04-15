/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import computeUnixShellEnvironmentInjectable from "./compute-unix-shell-environment.injectable";

export type EnvironmentVariables = Partial<Record<string, string>>;
export type ComputeShellEnvironment = (shell?: string | null) => AsyncResult<EnvironmentVariables | undefined, string>;

const computeShellEnvironmentInjectable = getInjectable({
  id: "compute-shell-environment",
  instantiate: (di): ComputeShellEnvironment => {
    const isWindows = di.inject(isWindowsInjectable);
    const computeUnixShellEnvironment = di.inject(computeUnixShellEnvironmentInjectable);
    const defaultShell = di.inject(defaultShellInjectable);

    if (isWindows) {
      return async () => ({
        callWasSuccessful: true,
        response: undefined,
      });
    }

    return async (shell) => {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), 30_000);

      const result = await computeUnixShellEnvironment(shell || defaultShell, { signal: controller.signal });

      clearTimeout(timeoutHandle);

      if (result.callWasSuccessful) {
        return result;
      }

      if (controller.signal.aborted) {
        return {
          callWasSuccessful: false,
          error: `Resolving shell environment is taking very long. Please review your shell configuration: ${result.error}`,
        };
      }

      return result;
    };
  },
});

export default computeShellEnvironmentInjectable;
