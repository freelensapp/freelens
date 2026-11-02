/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Logger } from "@freelensapp/logger";

/**
 * Chromium's net::ERR_ABORTED: the load was cancelled, which is what removing
 * a frame that is still loading does, e.g. the frame of a cluster that is
 * disconnected.
 */
const ERR_ABORTED = -3;

export interface FailedLoad {
  code: number;
  desc: string;
  url: string;
  isMainFrame: boolean;
}

/**
 * Logs a `did-fail-load` of a window's `webContents`. Electron emits it for
 * every frame, so only a failure of the main frame is a failure of the window;
 * the clusters render in subframes.
 */
export const logFailedLoad = (logger: Logger, windowId: string, { code, desc, url, isMainFrame }: FailedLoad) => {
  if (isMainFrame) {
    logger.error(`[CREATE-ELECTRON-WINDOW]: Failed to load window "${windowId}"`, { code, desc, url });
  } else if (code === ERR_ABORTED) {
    logger.debug(`[CREATE-ELECTRON-WINDOW]: Aborted load of a frame of window "${windowId}"`, { code, desc, url });
  } else {
    logger.warn(`[CREATE-ELECTRON-WINDOW]: Failed to load a frame of window "${windowId}"`, { code, desc, url });
  }
};
