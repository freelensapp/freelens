/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { findUnixShellFile, findWindowsShellFile } from "../../../main/shell-session/find-shell";

import type { AccessPath } from "../../../common/fs/access-path.injectable";
import type { Stat } from "../../../common/fs/stat.injectable";
import type { TerminalShellLookup } from "../common/channels";

export interface LookUpTerminalShellDependencies {
  defaultShell: string;
  isWindows: boolean;
  env: Record<string, string | undefined>;
  stat: Stat;
  accessPath: AccessPath;
}

/**
 * Looks up the shell a terminal starts for the given Terminal Shell Path setting, the way the terminal does: on
 * Windows on the `PATH` with the extensions of `PATHEXT`, elsewhere on the `PATH` as node-pty does.
 */
export async function lookUpTerminalShell(
  setting: string,
  { defaultShell, isWindows, env, stat, accessPath }: LookUpTerminalShellDependencies,
): Promise<TerminalShellLookup> {
  // As `getUserShell`: the setting, else the default shell
  const shell = setting || defaultShell;
  const path = isWindows
    ? await findWindowsShellFile(shell, env, stat)
    : await findUnixShellFile(shell, env, stat, accessPath);

  return path === undefined ? { shell } : { shell, path };
}
