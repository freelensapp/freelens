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

export type SweepOrphanedExtensionBuilds = (pathsToKeep: Iterable<string>) => Promise<void>;

/**
 * Collect the build directories left behind by a deferred deletion.
 *
 * Upgrading extracts the new build, switches to it and only then deletes the
 * old one, so a crash inside that window leaves a directory nothing points at.
 *
 * Every version directory which is not named in `pathsToKeep` is removed, so
 * the caller decides and this only carries the decision out. Discovery hands
 * over the live builds plus the ones it could not rule out, and never decides
 * by omission: a build it could not place is kept whole until a later scan can
 * place it. The residue is therefore not bounded by the next restart -- an
 * extension whose manifests stay unreadable keeps its builds indefinitely --
 * which is the price of not deleting a working extension on a guess.
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

    return async (pathsToKeep) => {
      const keep = new Set(pathsToKeep);

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
