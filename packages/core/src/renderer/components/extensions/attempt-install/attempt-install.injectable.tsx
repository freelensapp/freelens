/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import { disposer } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { shell } from "electron";
import { ExtensionInstallationState } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import createTempFilesAndValidateInjectable from "./create-temp-files-and-validate.injectable";
import getExtensionDestFolderInjectable from "./get-extension-dest-folder.injectable";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { ShowNotification } from "@freelensapp/notifications";
import type { Disposer } from "@freelensapp/utilities";

import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { InstallChecksum } from "../../../../features/extensions/installer/common/checksums";
import type { InstalledExtensionSource } from "../../../../features/extensions/installer/common/installed-extensions";
import type { CreateTempFilesAndValidate } from "./create-temp-files-and-validate.injectable";
import type { GetExtensionDestFolder } from "./get-extension-dest-folder.injectable";
import type { UnpackExtension } from "./unpack-extension.injectable";

export interface InstallRequest {
  fileName: string;
  data: Buffer;
  /**
   * What the user asked for, recorded with the install because it cannot be
   * recovered from the extracted tree afterwards.
   */
  source?: InstalledExtensionSource;
  /**
   * What the source vouched for. Absent means the download was unverifiable,
   * which warns rather than refuses.
   */
  checksum?: InstallChecksum;
}

interface Dependencies {
  extensionLoader: ExtensionLoader;
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
        <div className="flex flex-col gap-2">
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

    // Only one version of an extension is active at a time, and a version which
    // is already running cannot be swapped underneath itself: its module graph
    // stays in the realm it was loaded into for the life of the process.
    if (installedExtension?.isEnabled) {
      dispose();

      return void showErrorNotification(
        <div className="flex flex-col gap-2">
          <b>Extension is active:</b>
          <p>
            <em>{`${name}@${installedExtension.manifest.version}`}</em>
            {" is installed and active."}
          </p>
          <p>{"Disable or uninstall it first, then install this version."}</p>
        </div>,
      );
    }

    if (installedExtension) {
      const { version: oldVersion } = installedExtension.manifest;

      // confirm replacing the installed version, which is not active
      const removeNotification = showInfoNotification(
        <div className="InstallingExtensionNotification flex gap-2 items-center">
          <div className="flex flex-col gap-2">
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
              {` ${name}@${oldVersion} will be replaced by this installation.`}
            </div>
          </div>
          <Button
            autoFocus
            label="Install"
            onClick={async () => {
              removeNotification();

              await unpackExtension(validatedRequest, dispose);
            }}
          />
        </div>,
        {
          onClose: dispose,
        },
      );
    } else {
      await unpackExtension(validatedRequest, dispose);
    }
  };

const attemptInstallInjectable = getInjectable({
  id: "attempt-install",
  instantiate: (di) =>
    attemptInstall({
      extensionLoader: di.inject(extensionLoaderInjectable),
      unpackExtension: di.inject(unpackExtensionInjectable),
      createTempFilesAndValidate: di.inject(createTempFilesAndValidateInjectable),
      getExtensionDestFolder: di.inject(getExtensionDestFolderInjectable),
      installStateStore: di.inject(extensionInstallationStateStoreInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
      showInfoNotification: di.inject(showInfoNotificationInjectable),
    }),
});

export default attemptInstallInjectable;
