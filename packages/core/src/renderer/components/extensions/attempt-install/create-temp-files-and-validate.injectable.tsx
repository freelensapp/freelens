/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensExtensionId, LensExtensionManifest } from "@freelensapp/legacy-extensions";
import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import writeFileInjectable from "../../../../common/fs/write-file.injectable";
import tempDirectoryPathInjectable from "../../../../common/os/temp-directory-path.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import extensionDiscoveryInjectable from "../../../../extensions/extension-discovery/extension-discovery.injectable";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import type { InstallRequest } from "./attempt-install.injectable";
import { validatePackage } from "./validate-package";

export interface InstallRequestValidated {
  fileName: string;
  data: Buffer;
  id: LensExtensionId;
  manifest: LensExtensionManifest;
  tempFile: string; // temp system path to packed extension for unpacking
}

export type CreateTempFilesAndValidate = (request: InstallRequest) => Promise<InstallRequestValidated | null>;

const createTempFilesAndValidateInjectable = getInjectable({
  id: "create-temp-files-and-validate",
  instantiate: (di): CreateTempFilesAndValidate => {
    const extensionDiscovery = di.inject(extensionDiscoveryInjectable);
    const logger = di.inject(loggerInjectionToken);
    const writeFile = di.inject(writeFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const tempDirectoryPath = di.inject(tempDirectoryPathInjectable);

    const getTempExtensionPackagePath = (fileName: string) => joinPaths(tempDirectoryPath, "lens-extensions", fileName);

    return async ({ fileName, data }) => {
      // validate packages
      const tempFile = getTempExtensionPackagePath(fileName);

      try {
        await writeFile(tempFile, data);
        const manifest = await validatePackage(tempFile);
        const id = joinPaths(extensionDiscovery.nodeModulesPath, manifest.name, "package.json");

        return {
          fileName,
          data,
          manifest,
          tempFile,
          id,
        };
      } catch (error) {
        const message = getMessageFromError(error);

        logger.info(`[EXTENSION-INSTALLATION]: installing ${fileName} has failed: ${message}`, { error });
        showErrorNotification(
          <div className="flex column gaps">
            <p>
              {"Installing "}
              <em>{fileName}</em>
              {" has failed, skipping."}
            </p>
            <p>
              {"Reason: "}
              <em>{message}</em>
            </p>
          </div>,
        );
      }

      return null;
    };
  },
});

export default createTempFilesAndValidateInjectable;
