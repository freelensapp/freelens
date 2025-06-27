/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import AwaitLock from "await-lock";
import forkPnpmInjectable from "./fork-pnpm.injectable";

export type InstallExtension = (name: string) => Promise<void>;

const installExtensionInjectable = getInjectable({
  id: "install-extension",
  instantiate: (di): InstallExtension => {
    const logger = di.inject(prefixedLoggerInjectable, "EXTENSION-INSTALLER");

    const forkPnpm = di.inject(forkPnpmInjectable);

    const installLock = new AwaitLock();

    return async (name) => {
      await installLock.acquireAsync();

      try {
        logger.info(`installing package for extension "${name}"`);
        await forkPnpm("install", "--prefer-offline", "--prod", "--force");
        await forkPnpm("install", "--prefer-offline", "--prod", "--force", "--save-optional", name);
        logger.info(`installed package for extension "${name}"`);
      } finally {
        installLock.release();
      }
    };
  },
});

export default installExtensionInjectable;
