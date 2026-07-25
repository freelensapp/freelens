/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import AwaitLock from "../../common/utils/await-lock";
import forkPnpmInjectable from "./fork-pnpm.injectable";

export type InstallExtension = (params: { name: string; packageJsonPath: string }) => Promise<void>;

const installExtensionInjectable = getInjectable({
  id: "install-extension",
  instantiate: (di): InstallExtension => {
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");
    const pathExists = di.inject(pathExistsInjectable);
    const stat = di.inject(statInjectable);
    const writeJsonSync = di.inject(writeJsonSyncInjectable);

    const forkPnpm = di.inject(forkPnpmInjectable);

    const installLock = new AwaitLock();

    return async ({ name, packageJsonPath }) => {
      await installLock.acquireAsync();

      try {
        logger.info(`installing package for extension "${name}"`);
        if (!(await pathExists(packageJsonPath))) {
          writeJsonSync(packageJsonPath, { private: true });
        } else if ((await stat(packageJsonPath)).size === 0) {
          writeJsonSync(packageJsonPath, { private: true });
        }
        await forkPnpm("install", "--prefer-offline", "--prod", "--force", "--save-optional", name);
        logger.info(`installed package for extension "${name}"`);
      } catch (error) {
        logger.error(`pnpm failed: ${error}`);
      } finally {
        installLock.release();
      }
    };
  },
});

export default installExtensionInjectable;
