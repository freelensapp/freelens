/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import type { Disposer } from "@freelensapp/utilities";
import { noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import fse from "fs-extra";
import { when } from "mobx";
import React from "react";
import extractTarInjectable from "../../../../common/fs/extract-tar.injectable";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { extensionDisplayName } from "../../../../extensions/lens-extension";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import type { InstallRequestValidated } from "./create-temp-files-and-validate.injectable";
import getExtensionDestFolderInjectable from "./get-extension-dest-folder.injectable";

export type UnpackExtension = (request: InstallRequestValidated, disposeDownloading?: Disposer) => Promise<void>;

const unpackExtensionInjectable = getInjectable({
  id: "unpack-extension",
  instantiate: (di): UnpackExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const getExtensionDestFolder = di.inject(getExtensionDestFolderInjectable);
    const extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const extractTar = di.inject(extractTarInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    const displayErrorMessage = (message: string, displayName: string) => {
      showErrorNotification(
        <p>
          {"Installing extension "}
          <b>{displayName}</b>
          {" has failed: "}
          <em>{message}</em>
        </p>,
      );
    };

    return async (request, disposeDownloading) => {
      const {
        id,
        fileName,
        tempFile,
        manifest: { name, version },
      } = request;

      extensionInstallationStateStore.setInstalling(id);
      disposeDownloading?.();

      const displayName = extensionDisplayName(name, version);
      const extensionFolder = getExtensionDestFolder(name);
      const unpackingTempFolder = path.join(path.dirname(tempFile), `${path.basename(tempFile)}-unpacked`);

      logger.info(`Unpacking extension ${displayName}`, { fileName, tempFile });

      try {
        // extract to temp folder first
        await fse.remove(unpackingTempFolder).catch(noop);
        await fse.ensureDir(unpackingTempFolder);
        await extractTar(tempFile, { cwd: unpackingTempFolder });

        // move contents to extensions folder
        const unpackedFiles = await fse.readdir(unpackingTempFolder);
        let unpackedRootFolder = unpackingTempFolder;

        if (unpackedFiles.length === 1) {
          // check if %extension.tgz was packed with single top folder,
          // e.g. "npm pack %ext_name" downloads file with "package" root folder within tarball
          unpackedRootFolder = path.join(unpackingTempFolder, unpackedFiles[0]);
        }

        await fse.ensureDir(extensionFolder);
        await fse.move(unpackedRootFolder, extensionFolder, { overwrite: true });

        // wait for the loader has actually install it
        await when(() => extensionLoader.userExtensions.get().has(id), { timeout: 10000 })
          .then(() => {
            // Enable installed extensions by default.
            extensionLoader.setIsEnabled(id, true);

            showInfoNotification(
              <p>
                {"Extension "}
                <b>{displayName}</b>
                {" successfully installed!"}
              </p>,
            );
          })
          .catch((error) => {
            // There was an error during plugin installation
            logger.info(`[EXTENSION-INSTALLATION]: installing ${request.fileName} has failed due a timeout`, { error });
            displayErrorMessage("There was an error during the installation", displayName);
          });
      } catch (error) {
        const message = getMessageFromError(error);

        logger.info(`[EXTENSION-INSTALLATION]: installing ${request.fileName} has failed: ${message}`, { error });
        displayErrorMessage(message, displayName);
      } finally {
        // Remove install state once finished
        extensionInstallationStateStore.clearInstalling(id);

        // clean up
        fse.remove(unpackingTempFolder).catch(noop);
        fse.unlink(tempFile).catch(noop);
      }
    };
  },
});

export default unpackExtensionInjectable;
