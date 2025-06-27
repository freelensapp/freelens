/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import AwaitLock from "await-lock";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import forkPnpmInjectable from "./fork-pnpm.injectable";

export type InstallExtension = (name: string) => Promise<void>;

const installExtensionInjectable = getInjectable({
  id: "install-extension",
  instantiate: (di): InstallExtension => {
    const directoryForUserData = di.inject(directoryForUserDataInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");
    const joinPaths = di.inject(joinPathsInjectable);
    const pathExists = di.inject(pathExistsInjectable);

    const forkPnpm = di.inject(forkPnpmInjectable);

    const installLock = new AwaitLock();

    const packageLock = joinPaths(directoryForUserData, "package.json");

    return async (name) => {
      await installLock.acquireAsync();

      try {
        logger.info(`installing package for extension "${name}"`);
        if (await pathExists(packageLock)) {
          await forkPnpm("install", "--prefer-offline", "--prod", "--force");
        }
        await forkPnpm("install", "--prefer-offline", "--prod", "--force", "--save-optional", name);
        logger.info(`installed package for extension "${name}"`);
      } catch (error) {
        logger.error(`pnpm failed: ${error}`);
      }
      installLock.release();
    };
  },
});

export default installExtensionInjectable;
