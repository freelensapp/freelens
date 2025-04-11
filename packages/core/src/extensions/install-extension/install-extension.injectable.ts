/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { fork } from "child_process";
import AwaitLock from "await-lock";
import pathToPnpmCliInjectable from "../../common/app-paths/path-to-pnpm-cli.injectable";
import extensionPackageRootDirectoryInjectable from "./extension-package-root-directory.injectable";
import { prefixedLoggerInjectable } from "@freelensapp/logger";
import readJsonFileInjectable from "../../common/fs/read-json-file.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import type { PackageJson } from "../common-api";
import writeJsonFileInjectable from "../../common/fs/write-json-file.injectable";
import { once } from "lodash";
import { isErrnoException } from "@freelensapp/utilities";

const basePnpmInstallArgs = [
  "install",
  "--prefer-offline",
  "--prod",
  "--save-optional"
];

export type InstallExtension = (name: string) => Promise<void>;

const installExtensionInjectable = getInjectable({
  id: "install-extension",
  instantiate: (di): InstallExtension => {
    const pathToPnpmCli = di.inject(pathToPnpmCliInjectable);
    const extensionPackageRootDirectory = di.inject(extensionPackageRootDirectoryInjectable);
    const readJsonFile = di.inject(readJsonFileInjectable);
    const writeJsonFile = di.inject(writeJsonFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");

    const forkPnpm = (...args: string[]) => new Promise<void>((resolve, reject) => {
      const child = fork(pathToPnpmCli, args, {
        cwd: extensionPackageRootDirectory,
        silent: false,
      });
      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", data => {
        stdout += String(data);
      });

      child.stderr?.on("data", data => {
        stderr += String(data);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error([stdout,stderr].join("\n")));
        } else {
          resolve();
        }
      });

      child.on("error", error => {
        reject(error);
      });
    });

    const packageJsonPath = joinPaths(extensionPackageRootDirectory, "package.json");

    /**
     * NOTES:
     *   - We have to keep the `package.json` because `pnpm install` removes files from `node_modules`
     *     if they are no longer in the `package.json`
     *   - In v6.2.X we saved bundled extensions as `"dependencies"` and external extensions as
     *     `"optionalDependencies"` at startup. This was done because `"optionalDependencies"` can
     *     fail to install and that is OK.
     *   - We continue to maintain this behavior here by only installing new dependencies as
     *     `"optionalDependencies"`
     */
    const fixupPackageJson = once(async () => {
      try {
        const packageJson = await readJsonFile(packageJsonPath) as PackageJson;

        delete packageJson.dependencies;

        await writeJsonFile(packageJsonPath, packageJson);
      } catch (error) {
        if (isErrnoException(error) && error.code === "ENOENT") {
          return;
        }

        throw error;
      }
    });

    const installLock = new AwaitLock();

    return async (name) => {
      await installLock.acquireAsync();
      await fixupPackageJson();

      try {
        logger.info(`installing package for extension "${name}"`);
        await forkPnpm(...basePnpmInstallArgs, name);
        logger.info(`installed package for extension "${name}"`);
      } finally {
        installLock.release();
      }
    };
  },
});

export default installExtensionInjectable;
