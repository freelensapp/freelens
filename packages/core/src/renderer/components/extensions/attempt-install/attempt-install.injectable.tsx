/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import type { LensExtensionId } from "@freelensapp/legacy-extensions";
import type { ShowNotification } from "@freelensapp/notifications";
import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import type { Disposer } from "@freelensapp/utilities";
import { disposer } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { shell } from "electron";
import { remove as removeDir } from "fs-extra";
import React from "react";
import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import { ExtensionInstallationState } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import uninstallExtensionInjectable from "../uninstall-extension.injectable";
import type { CreateTempFilesAndValidate } from "./create-temp-files-and-validate.injectable";
import createTempFilesAndValidateInjectable from "./create-temp-files-and-validate.injectable";
import type { GetExtensionDestFolder } from "./get-extension-dest-folder.injectable";
import getExtensionDestFolderInjectable from "./get-extension-dest-folder.injectable";
import type { UnpackExtension } from "./unpack-extension.injectable";
import unpackExtensionInjectable from "./unpack-extension.injectable";

export interface InstallRequest {
  fileName: string;
  data: Buffer;
}

interface Dependencies {
  extensionLoader: ExtensionLoader;
  uninstallExtension: (id: LensExtensionId) => Promise<boolean>;
  unpackExtension: UnpackExtension;
  createTempFilesAndValidate: CreateTempFilesAndValidate;
  getExtensionDestFolder: GetExtensionDestFolder;
  installStateStore: ExtensionInstallationStateStore;
  showErrorNotification: ShowNotification;
  showInfoNotification: ShowNotification;
}

export type AttemptInstall = (request: InstallRequest, cleanup?: Disposer) => Promise<void>;

const attemptInstall =
  ({
    extensionLoader,
    uninstallExtension,
    unpackExtension,
    createTempFilesAndValidate,
    getExtensionDestFolder,
    installStateStore,
    showErrorNotification,
    showInfoNotification,
  }: Dependencies): AttemptInstall =>
  async (request, cleanup) => {
    const dispose = disposer(installStateStore.startPreInstall(), cleanup);

    const validatedRequest = await createTempFilesAndValidate(request);

    if (!validatedRequest) {
      return dispose();
    }

    const { name, version, description } = validatedRequest.manifest;
    const curState = installStateStore.getInstallationState(validatedRequest.id);

    if (curState !== ExtensionInstallationState.IDLE) {
      dispose();

      return void showErrorNotification(
        <div className="flex column gaps">
          <b>Extension Install Collision:</b>
          <p>
            {"The "}
            <em>{name}</em>
            {` extension is currently ${curState.toLowerCase()}.`}
          </p>
          <p>Will not proceed with this current install request.</p>
        </div>,
      );
    }

    const extensionFolder = getExtensionDestFolder(name);
    const installedExtension = extensionLoader.getExtensionById(validatedRequest.id);

    if (installedExtension) {
      const { version: oldVersion } = installedExtension.manifest;

      // confirm to uninstall old version before installing new version
      const removeNotification = showInfoNotification(
        <div className="InstallingExtensionNotification flex gaps align-center">
          <div className="flex column gaps">
            <p>
              {"Install extension "}
              <b>{`${name}@${version}`}</b>?
            </p>
            <p>
              {"Description: "}
              <em>{description}</em>
            </p>
            <div className="remove-folder-warning" onClick={() => shell.openPath(extensionFolder)}>
              <b>Warning:</b>
              {` ${name}@${oldVersion} will be removed before installation.`}
            </div>
          </div>
          <Button
            autoFocus
            label="Install"
            onClick={async () => {
              removeNotification();

              if (await uninstallExtension(validatedRequest.id)) {
                await unpackExtension(validatedRequest, dispose);
              } else {
                dispose();
              }
            }}
          />
        </div>,
        {
          onClose: dispose,
        },
      );
    } else {
      // clean up old data if still around
      await removeDir(extensionFolder);

      // install extension if not yet exists
      await unpackExtension(validatedRequest, dispose);
    }
  };

const attemptInstallInjectable = getInjectable({
  id: "attempt-install",
  instantiate: (di) =>
    attemptInstall({
      extensionLoader: di.inject(extensionLoaderInjectable),
      uninstallExtension: di.inject(uninstallExtensionInjectable),
      unpackExtension: di.inject(unpackExtensionInjectable),
      createTempFilesAndValidate: di.inject(createTempFilesAndValidateInjectable),
      getExtensionDestFolder: di.inject(getExtensionDestFolderInjectable),
      installStateStore: di.inject(extensionInstallationStateStoreInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
      showInfoNotification: di.inject(showInfoNotificationInjectable),
    }),
});

export default attemptInstallInjectable;
