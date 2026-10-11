/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import defaultShellInjectable from "../../common/vars/default-shell.injectable";
import computeShellEnvironmentInjectable from "../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";

import type { EnvironmentVariables } from "../../features/shell-sync/main/compute-shell-environment.injectable";

export interface UserShellEnvironment {
  /** The user's shell setting, else the system default shell. */
  readonly shell: string;
  /** The environment of a login shell of {@link shell}, else `process.env`. */
  readonly environment: EnvironmentVariables;
  /** Why the shell's environment could not be read, when it could not. */
  readonly error?: string;
}

export type ComputeUserShellEnvironment = () => Promise<UserShellEnvironment>;

/**
 * The environment the terminals and the extension API start from: what the
 * user's own shell would have, falling back to Freelens' own environment.
 */
const computeUserShellEnvironmentInjectable = getInjectable({
  id: "compute-user-shell-environment",

  instantiate: (di): ComputeUserShellEnvironment => {
    const userShellSetting = di.inject(userShellSettingInjectable);
    const defaultShell = di.inject(defaultShellInjectable);
    const computeShellEnvironment = di.inject(computeShellEnvironmentInjectable);

    return async () => {
      const shell = userShellSetting.get() || defaultShell;
      const result = await computeShellEnvironment(shell);

      if (result.callWasSuccessful) {
        return { shell, environment: result.response ?? process.env };
      }

      return { shell, environment: process.env, error: result.error };
    };
  },
});

export default computeUserShellEnvironmentInjectable;
