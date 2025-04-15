/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type { ProgressInfo } from "electron-updater";
import electronUpdaterInjectable from "../../../../../main/electron-app/features/electron-updater.injectable";
import type { ProgressOfDownload } from "../../../common/progress-of-update-download.injectable";

export type DownloadPlatformUpdate = (
  onDownloadProgress: (arg: ProgressOfDownload) => void,
) => Promise<{ downloadWasSuccessful: boolean }>;

const downloadPlatformUpdateInjectable = getInjectable({
  id: "download-platform-update",

  instantiate: (di): DownloadPlatformUpdate => {
    const electronUpdater = di.inject(electronUpdaterInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (onDownloadProgress) => {
      onDownloadProgress({ percentage: 0 });

      const updateDownloadProgress = ({ percent: percentage }: ProgressInfo) => onDownloadProgress({ percentage });

      electronUpdater.on("download-progress", updateDownloadProgress);

      try {
        await electronUpdater.downloadUpdate();
      } catch (error) {
        logger.error("[UPDATE-APP/DOWNLOAD]", error);

        return { downloadWasSuccessful: false };
      } finally {
        electronUpdater.off("download-progress", updateDownloadProgress);
      }

      return { downloadWasSuccessful: true };
    };
  },
});

export default downloadPlatformUpdateInjectable;
