/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import AwaitLock from "await-lock";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import forkPnpmInjectable from "./fork-pnpm.injectable";

export type InstallExtension = (params: { name: string; packageJsonPath: string }) => Promise<void>;

const installExtensionInjectable = getInjectable({
  id: "install-extension",
  instantiate: (di): InstallExtension => {
    const directoryForUserData = di.inject(directoryForUserDataInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");
    const joinPaths = di.inject(joinPathsInjectable);
    const removePath = di.inject(removePathInjectable);
    const stat = di.inject(statInjectable);

    const forkPnpm = di.inject(forkPnpmInjectable);

    const installLock = new AwaitLock();

    const packageLock = joinPaths(directoryForUserData, "package.json");

    return async ({ name, packageJsonPath }) => {
      await installLock.acquireAsync();

      try {
        logger.info(`installing package for extension "${name}"`);
        try {
          const s = await stat(packageLock);
          if (s.size == 0) {
            try {
              await removePath(packageJsonPath);
            } catch (error) {
              logger.error(`package.json has zero size and cannot be removed: ${error}`);
            }
          } else if (s.size > 0) {
            await forkPnpm("install", "--prefer-offline", "--prod", "--force");
          }
        } catch (_) {}
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
