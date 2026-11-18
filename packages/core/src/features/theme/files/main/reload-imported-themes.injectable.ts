/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import ensureDirInjectable from "../../../../common/fs/ensure-dir.injectable";
import readDirectoryInjectable from "../../../../common/fs/read-directory.injectable";
import readFileInjectable from "../../../../common/fs/read-file.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import { isThemeFileName, readThemesDirectory } from "../common/read-themes-directory";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import themesDirectoryInjectable from "./themes-directory.injectable";

import type { ThemeDirectoryFile } from "../common/read-themes-directory";

export type ReloadImportedThemes = () => Promise<void>;

/**
 * Reads the themes directory again. Calls do not overlap: one that comes while a read is running
 * waits for it and reads again, so the last state on disk always wins.
 */
const reloadImportedThemesInjectable = getInjectable({
  id: "reload-imported-themes",
  instantiate: (di): ReloadImportedThemes => {
    const themesDirectory = di.inject(themesDirectoryInjectable);
    const ensureDir = di.inject(ensureDirInjectable);
    const readDirectory = di.inject(readDirectoryInjectable);
    const readFile = di.inject(readFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const state = di.inject(importedThemesStateInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "THEMES");

    const reload = async () => {
      await ensureDir(themesDirectory);

      const fileNames = (await readDirectory(themesDirectory)).filter(isThemeFileName);
      const files: ThemeDirectoryFile[] = [];

      for (const fileName of fileNames) {
        try {
          files.push({ fileName, content: await readFile(joinPaths(themesDirectory, fileName)) });
        } catch (error) {
          // Removed between the listing and the read, or not a file: the watcher reloads again.
          logger.warn(`Failed to read ${fileName}`, error);
        }
      }

      const next = readThemesDirectory(files);

      for (const { fileName, error } of next.invalidFiles) {
        logger.warn(`${fileName} is not applied: ${error}`);
      }

      runInAction(() => state.set(next));
    };

    let queue = Promise.resolve();
    let isQueued = false;

    return () => {
      // A read that is waiting to start reads the latest state as well, so a second one is useless.
      if (isQueued) {
        return queue;
      }

      isQueued = true;
      queue = queue
        .then(() => {
          isQueued = false;

          return reload();
        })
        .catch((error) => logger.error("Failed to read the themes directory", error));

      return queue;
    };
  },
});

export default reloadImportedThemesInjectable;
