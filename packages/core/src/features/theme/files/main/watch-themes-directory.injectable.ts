/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import watchInjectable from "../../../../common/fs/watch/watch.injectable";
import themesDirectoryInjectable from "./themes-directory.injectable";

export type WatchThemesDirectory = (onChange: () => void) => void;

/**
 * Calls `onChange` shortly after a file of the themes directory is added, changed or removed, once
 * for a burst of changes, such as an editor writing a file in several steps.
 */
const watchThemesDirectoryInjectable = getInjectable({
  id: "watch-themes-directory",
  instantiate: (di): WatchThemesDirectory => {
    const watch = di.inject(watchInjectable);
    const themesDirectory = di.inject(themesDirectoryInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "THEMES");

    return (onChange) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(onChange, 200);
      };

      watch(themesDirectory, {
        ignoreInitial: true,
        depth: 0,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      })
        .on("add", schedule)
        .on("change", schedule)
        .on("unlink", schedule)
        .on("error", (error) => logger.warn("Failed to watch the themes directory", error));
    };
  },
  causesSideEffects: true,
});

export default watchThemesDirectoryInjectable;
