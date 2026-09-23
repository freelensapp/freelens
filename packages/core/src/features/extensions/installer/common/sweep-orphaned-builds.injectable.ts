/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { isErrnoException } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import readDirectoryInjectable from "../../../../common/fs/read-directory.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import extensionsRootInjectable from "./extensions-root.injectable";
import { parseVersionDirectoryName } from "./version-directory";

export type SweepOrphanedExtensionBuilds = (livePaths: Iterable<string>) => Promise<void>;

/**
 * Collect the build directories left behind by a deferred deletion.
 *
 * Upgrading extracts the new build, switches to it and only then deletes the
 * old one, so a crash inside that window leaves a directory nothing points at.
 * A version directory which is neither live nor loaded can go unconditionally,
 * which bounds the residue to "until the next restart" instead of letting it
 * accumulate.
 *
 * Failing to remove one is not an error: Windows locks files belonging to a
 * running process, and the next startup will try again.
 */
const sweepOrphanedExtensionBuildsInjectable = getInjectable({
  id: "sweep-orphaned-extension-builds",
  instantiate: (di): SweepOrphanedExtensionBuilds => {
    const extensionsRoot = di.inject(extensionsRootInjectable);
    const readDirectory = di.inject(readDirectoryInjectable);
    const removePath = di.inject(removePathInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const logger = di.inject(loggerInjectionToken);

    const readDirectories = async (directory: string): Promise<string[]> => {
      try {
        const entries = await readDirectory(directory, { withFileTypes: true });

        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      } catch (error) {
        if (!isErrnoException(error) || error.code !== "ENOENT") {
          logger.warn(`[EXTENSION-SWEEP]: cannot read ${directory}: ${error}`);
        }

        return [];
      }
    };

    return async (livePaths) => {
      const keep = new Set(livePaths);

      for (const extensionDirectoryName of await readDirectories(extensionsRoot)) {
        const extensionDirectory = joinPaths(extensionsRoot, extensionDirectoryName);

        for (const buildDirectoryName of await readDirectories(extensionDirectory)) {
          if (!parseVersionDirectoryName(buildDirectoryName)) {
            continue;
          }

          const buildDirectory = joinPaths(extensionDirectory, buildDirectoryName);

          if (keep.has(buildDirectory)) {
            continue;
          }

          try {
            await removePath(buildDirectory);
            logger.info(`[EXTENSION-SWEEP]: removed orphaned build ${buildDirectory}`);
          } catch (error) {
            logger.warn(`[EXTENSION-SWEEP]: cannot remove orphaned build ${buildDirectory}: ${error}`);
          }
        }
      }
    };
  },
});

export default sweepOrphanedExtensionBuildsInjectable;
