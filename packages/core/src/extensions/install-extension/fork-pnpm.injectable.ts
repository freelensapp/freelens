/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { fork } from "child_process";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import pathToPnpmCliInjectable from "../../common/app-paths/path-to-pnpm-cli.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import extensionPackageRootDirectoryInjectable from "./extension-package-root-directory.injectable";

export type ForkPnpm = (...args: string[]) => Promise<void>;

const forkPnpmInjectable = getInjectable({
  id: "fork-pnpm",
  instantiate: (di): ForkPnpm => {
    const directoryForUserData = di.inject(directoryForUserDataInjectable);
    const pathToPnpmCli = di.inject(pathToPnpmCliInjectable);
    const extensionPackageRootDirectory = di.inject(extensionPackageRootDirectoryInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");

    const pnpmHome = joinPaths(directoryForUserData, "pnpm", "data");
    const cacheDir = joinPaths(directoryForUserData, "cache");
    const configDir = joinPaths(directoryForUserData, "config");
    const stateDir = joinPaths(directoryForUserData, "state");

    return (...args: string[]) => {
      return new Promise<void>((resolve, reject) => {
        logger.debug(["pnpm"].concat(args).join(" "));

        const child = fork(pathToPnpmCli, args, {
          cwd: extensionPackageRootDirectory,
          silent: false,
          env: {
            ...process.env,
            PNPM_HOME: pnpmHome,
            XDG_CACHE_HOME: cacheDir,
            XDG_CONFIG_HOME: configDir,
            XDG_STATE_HOME: stateDir,
          },
        });
        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += String(data);
        });

        child.stderr?.on("data", (data) => {
          stderr += String(data);
        });

        child.on("close", (code) => {
          if (code !== 0) {
            reject(new Error([stdout, stderr].join("\n")));
          } else {
            resolve();
          }
        });

        child.on("error", (error) => {
          reject(error);
        });
      });
    };
  },
});

export default forkPnpmInjectable;
