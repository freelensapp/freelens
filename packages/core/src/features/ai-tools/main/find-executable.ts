/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface FindExecutableOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

/**
 * Directories where the installers of AI CLIs put them, searched after
 * `PATH`. An application started from the dock or a desktop launcher often
 * gets a `PATH` without them, even after shell sync.
 */
export const wellKnownBinDirectories = (platform: NodeJS.Platform, homeDirectory: string, env: NodeJS.ProcessEnv) =>
  platform === "win32"
    ? [
        env.APPDATA && path.win32.join(env.APPDATA, "npm"),
        env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, "Programs"),
      ].filter((dir): dir is string => Boolean(dir))
    : [
        path.posix.join(homeDirectory, ".local", "bin"),
        path.posix.join(homeDirectory, ".claude", "local"),
        path.posix.join(homeDirectory, ".opencode", "bin"),
        path.posix.join(homeDirectory, ".npm-global", "bin"),
        path.posix.join(homeDirectory, ".bun", "bin"),
        path.posix.join(homeDirectory, ".volta", "bin"),
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
      ];

const isExecutableFile = async (candidate: string, platform: NodeJS.Platform) => {
  try {
    await access(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);

    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
};

/**
 * Resolves a command name, or a path, to an executable file. Returns
 * undefined when there is none.
 */
export const findExecutable = async (command: string, options: FindExecutableOptions = {}) => {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const expanded = command.startsWith("~/") ? pathApi.join(homeDirectory, command.slice(2)) : command;
  const extensions =
    platform === "win32" && !pathApi.extname(expanded)
      ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
      : [""];
  const hasDirectory = expanded.includes("/") || (platform === "win32" && expanded.includes("\\"));

  const directories = hasDirectory
    ? [""]
    : [
        ...(env.PATH ?? env.Path ?? "").split(platform === "win32" ? ";" : ":").filter(Boolean),
        ...wellKnownBinDirectories(platform, homeDirectory, env),
      ];

  const seen = new Set<string>();

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = directory ? pathApi.join(directory, `${expanded}${extension}`) : `${expanded}${extension}`;

      if (seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);

      if (await isExecutableFile(candidate, platform)) {
        return candidate;
      }
    }
  }

  return undefined;
};

/**
 * First line of `<executable> <args>`, or undefined when the command fails or
 * takes too long.
 */
export const readVersion = (executable: string, args: string[], timeout = 5_000) =>
  new Promise<string | undefined>((resolve) => {
    execFile(
      executable,
      args,
      { timeout, windowsHide: true, shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(executable) },
      (error, stdout) => {
        if (error) {
          resolve(undefined);

          return;
        }

        const line = String(stdout)
          .split(/\r?\n/)
          .find((value) => value.trim());

        resolve(line?.trim().slice(0, 80));
      },
    );
  });
