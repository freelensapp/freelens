/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { constants } from "node:fs";
import path from "node:path";

import type { AccessPath } from "../../common/fs/access-path.injectable";
import type { Stat } from "../../common/fs/stat.injectable";

type Environment = Record<string, string | undefined>;

/**
 * The full path of a Windows shell given by name only, such as `wsl.exe`,
 * looked up on the `PATH` of its environment with the extensions of
 * `PATHEXT` when it has none; the name as it is when no directory has it.
 *
 * node-pty looks such a name up itself, but in the current folder of
 * Freelens first, and when the file is there it starts nothing and reports
 * `File not found: ` with an empty path (microsoft/node-pty#1005). That is
 * the case of `wsl.exe` and `cmd.exe` when Freelens starts in
 * `C:\Windows\System32`.
 *
 * Keep it when node-pty fixes that (microsoft/node-pty#1006): the lookup of
 * node-pty still differs. It reads the `Path` of the Freelens process rather
 * than of the shell's environment, adds no `PATHEXT` extension, skips the
 * last directory of `Path`, and prefers a file of that name in the current
 * folder of Freelens. node-pty takes a full path as it is, so this lookup
 * does not get in the way of its fix.
 */
export async function findWindowsShell(shell: string, env: Environment, stat: Stat): Promise<string> {
  if (!shell || /[\\/:]/.test(shell)) {
    return shell;
  }

  const valueOf = (name: string) => Object.entries(env).find(([key]) => key.toUpperCase() === name)?.[1] ?? "";
  // `PATHEXT` spells the extensions in upper case, the files have them in lower case
  const extensions = path.win32.extname(shell)
    ? [""]
    : (valueOf("PATHEXT") || ".COM;.EXE;.BAT;.CMD")
        .split(";")
        .filter(Boolean)
        .map((extension) => extension.toLowerCase());
  const directories = valueOf("PATH")
    .split(";")
    .map((directory) => directory.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.win32.join(directory, `${shell}${extension}`);

      try {
        if ((await stat(candidate)).isFile()) {
          return candidate;
        }
      } catch {
        // not in this directory
      }
    }
  }

  return shell;
}

/**
 * The file a Windows terminal starts for `shell`, found as {@link findWindowsShell} finds it, or `undefined` when
 * there is no such file.
 */
export async function findWindowsShellFile(shell: string, env: Environment, stat: Stat): Promise<string | undefined> {
  const file = await findWindowsShell(shell, env, stat);

  // A name that no directory of PATH has comes back as it is: node-pty would not find it either.
  if (!/[\\/:]/.test(file)) {
    return undefined;
  }

  try {
    return (await stat(file)).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The file a terminal on macOS or Linux starts for `shell`: the shell itself when it is a path, else the first
 * executable file of that name in the directories of `PATH`, as node-pty looks it up; `undefined` when there is none.
 */
export async function findUnixShellFile(
  shell: string,
  env: Environment,
  stat: Stat,
  accessPath: AccessPath,
): Promise<string | undefined> {
  const isExecutableFile = async (candidate: string) => {
    try {
      return (await stat(candidate)).isFile() && (await accessPath(candidate, constants.X_OK));
    } catch {
      return false;
    }
  };

  if (!shell) {
    return undefined;
  }

  if (shell.includes("/")) {
    return (await isExecutableFile(shell)) ? shell : undefined;
  }

  for (const directory of (env.PATH ?? "").split(":").filter(Boolean)) {
    const candidate = path.posix.join(directory, shell);

    if (await isExecutableFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
