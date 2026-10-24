/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import extensionsRootInjectable from "./extensions-root.injectable";
import installedExtensionsStateInjectable from "./installed-extensions-state.injectable";
import { managedDirectoryOf } from "./managed-directory";
import recordInstalledExtensionInjectable from "./record-installed-extension.injectable";

import type { InstalledExtensionEntry } from "./installed-extensions";

export type ActivateInstalledBuild = (entry: InstalledExtensionEntry) => Promise<void>;

/**
 * Make a freshly installed build the live one, and take the superseded build
 * with it.
 *
 * The order matters: the new build is already extracted and is recorded before
 * anything is deleted, so an interruption leaves the new install working and at
 * worst an extra directory behind. Windows refuses to delete files belonging to
 * a running process, so the deletion is allowed to fail -- the sweep at the next
 * startup collects what is left.
 *
 * A build outside the managed root was registered in place and is never
 * deleted, only dropped from the registry.
 */
const activateInstalledBuildInjectable = getInjectable({
  id: "activate-installed-build",
  instantiate: (di): ActivateInstalledBuild => {
    const extensionsRoot = di.inject(extensionsRootInjectable);
    const installedExtensions = di.inject(installedExtensionsStateInjectable);
    const recordInstalledExtension = di.inject(recordInstalledExtensionInjectable);
    const removePath = di.inject(removePathInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (entry) => {
      const supersededPath = installedExtensions.get(entry.name)?.path;

      recordInstalledExtension(entry);

      if (!supersededPath || supersededPath === entry.path) {
        return;
      }

      if (!managedDirectoryOf(extensionsRoot, supersededPath)) {
        logger.info(
          `[EXTENSION-INSTALL]: ${entry.name} was registered from ${supersededPath}, which is left where it is`,
        );

        return;
      }

      try {
        await removePath(supersededPath);
        logger.info(`[EXTENSION-INSTALL]: removed the superseded build ${supersededPath}`);
      } catch (error) {
        logger.warn(
          `[EXTENSION-INSTALL]: cannot remove the superseded build ${supersededPath} yet, leaving it to the sweep: ${error}`,
        );
      }
    };
  },
});

export default activateInstalledBuildInjectable;
