/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { ipcMain } from "electron";
import readFileInjectable from "../../../../../../common/fs/read-file.injectable";
import joinPathsInjectable from "../../../../../../common/path/join-paths.injectable";
import staticFilesDirectoryInjectable from "../../../../../../common/vars/static-files-directory.injectable";
import createElectronWindowInjectable from "../../../../../../main/start-main-application/lens-window/application-window/create-electron-window.injectable";

export type ShowLicensesWindow = () => Promise<void>;

const showLicensesWindowInjectable = getInjectable({
  id: "show-licenses-window",

  instantiate: (di): ShowLicensesWindow => {
    const createElectronWindow = di.inject(createElectronWindowInjectable);
    const readFile = di.inject(readFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const staticFilesDirectory = di.inject(staticFilesDirectoryInjectable);
    const logger = di.inject(loggerInjectionToken);

    let window: ReturnType<typeof createElectronWindow> | undefined;

    return async () => {
      if (window) {
        window.show();
        return;
      }

      try {
        const licenseFilePath = joinPaths(staticFilesDirectory, "build/license.txt");
        const licenseContent = await readFile(licenseFilePath);

        window = createElectronWindow({
          id: "licenses",
          title: "Licenses",
          defaultWidth: 800,
          defaultHeight: 600,
          resizable: true,
          windowFrameUtilitiesAreShown: true,
          centered: true,
          getContentSource: () => ({
            file: joinPaths(staticFilesDirectory, "licenses.html"),
          }),
          onClose: () => {
            ipcMain.removeAllListeners("request-license-content");
            window = undefined;
          },
        });

        // Handle license content request from renderer
        ipcMain.once("request-license-content", (event) => {
          event.sender.send("license-content", licenseContent);
        });

        await window.loadFile(joinPaths(staticFilesDirectory, "licenses.html"));
        window.show();
      } catch (error) {
        logger.error("[LICENSES-WINDOW]: Failed to show licenses window", { error });
      }
    };
  },

  causesSideEffects: true,
});

export default showLicensesWindowInjectable;
