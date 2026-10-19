/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { disposer } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { shell } from "electron";
import { ExtensionInstallationState } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { verifyInstallChecksum } from "../../../../features/extensions/installer/common/checksums";
import confirmInjectable from "../../confirm-dialog/confirm.injectable";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import createTempFilesAndValidateInjectable from "./create-temp-files-and-validate.injectable";
import { disabledForReinstallNote, installFailureSubject } from "./disabled-for-reinstall";
import getExtensionDestFolderInjectable from "./get-extension-dest-folder.injectable";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { Logger } from "@freelensapp/logger";
import type { ShowNotification } from "@freelensapp/notifications";
import type { Disposer } from "@freelensapp/utilities";

import type { ExtensionInstallationStateStore } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { InstallChecksum } from "../../../../features/extensions/installer/common/checksums";
import type { InstalledExtensionSource } from "../../../../features/extensions/installer/common/installed-extensions";
import type { Confirm } from "../../confirm-dialog/confirm.injectable";
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
  confirm: Confirm;
  showErrorNotification: ShowNotification;
  logger: Logger;
}

export type AttemptInstall = (request: InstallRequest, cleanup?: Disposer) => Promise<void>;

/**
 * Why this download may not be installed, or `undefined` when nothing is wrong
 * with it. An absent checksum is not a failure: it warns later, once there is a
 * name to warn about.
 *
 * A checksum string we cannot evaluate fails too. It is a different failure --
 * an unverifiable download rather than a corrupt one -- but it is not a reason
 * to go ahead unchecked.
 */
function checksumFailure({ data, checksum, fileName }: InstallRequest, logger: Logger): string | undefined {
  if (!checksum) {
    return undefined;
  }

  try {
    const mismatch = verifyInstallChecksum(data, checksum);

    if (!mismatch) {
      return undefined;
    }

    logger.warn(
      `[EXTENSION-INSTALLATION]: ${fileName} does not match its ${mismatch.algorithm} checksum: expected ${mismatch.expected}, got ${mismatch.actual}`,
    );

    return `the download does not match the ${mismatch.algorithm} checksum published for it`;
  } catch (error) {
    logger.warn(`[EXTENSION-INSTALLATION]: cannot check ${fileName} against its checksum: ${error}`);

    return `the checksum published for the download cannot be checked (${error})`;
  }
}

const attemptInstall =
  ({
    extensionLoader,
    unpackExtension,
    createTempFilesAndValidate,
    getExtensionDestFolder,
    installStateStore,
    confirm,
    showErrorNotification,
    logger,
  }: Dependencies): AttemptInstall =>
  async (request, cleanup) => {
    const dispose = disposer(installStateStore.startPreInstall(), cleanup);

    // Before the bytes are written anywhere and before anything reads inside
    // the archive. A tarball which is not what its source vouched for must not
    // reach node-tar, and must not be the thing whose name, version and
    // description the confirmation below puts in front of the user.
    const failure = checksumFailure(request, logger);

    if (failure) {
      dispose();

      return void showErrorNotification(
        <div className="flex flex-col gap-2">
          <p>
            {"Installing "}
            <em>{request.fileName}</em>
            {" has failed, skipping."}
          </p>
          <p>
            {"Reason: "}
            <em>{failure}</em>
          </p>
        </div>,
      );
    }

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

    const installedExtension = extensionLoader.getExtensionById(validatedRequest.id);

    if (!installedExtension) {
      return unpackExtension(validatedRequest, dispose);
    }

    const { version: oldVersion } = installedExtension.manifest;
    const extensionFolder = getExtensionDestFolder(name);
    const isEnabled = installedExtension.isEnabled;
    // "Reinstall" says the same build is installed again: the same version,
    // and a package in place of a package. A package in place of a directory
    // registered in development is a replacement, whatever the versions say.
    const isReinstall = oldVersion === version && installedExtension.isManaged;

    const proceed = await confirm({
      message: (
        <div className="flex flex-col gap-2">
          <p>
            {!isEnabled ? (
              <>
                {"Install extension "}
                <b>{`${name}@${version}`}</b>?
              </>
            ) : isReinstall ? (
              <>
                {"Reinstall "}
                <b>{name}</b>?
              </>
            ) : (
              <>
                {"Replace "}
                <b>{`${name}@${oldVersion}`}</b>
                {!installedExtension.isManaged && (
                  <>
                    {" from "}
                    <code>{installedExtension.absolutePath}</code>
                  </>
                )}
                {" with "}
                <b>{`${name}@${version}`}</b>?
              </>
            )}
          </p>
          <p>
            {"Description: "}
            <em>{description}</em>
          </p>
          <div className="remove-folder-warning" onClick={() => shell.openPath(extensionFolder)}>
            <b>Warning:</b>
            {!isEnabled
              ? ` ${name}@${oldVersion} will be replaced by this installation.`
              : isReinstall
                ? ` ${name}@${oldVersion} is enabled and will be disabled and installed again.`
                : ` ${name}@${oldVersion} is enabled and will be disabled and replaced by ${name}@${version}.`}
          </div>
        </div>
      ),
      labelCancel: "Cancel",
      labelOk: !isEnabled ? "Install" : isReinstall ? "Reinstall" : "Replace",
    });

    if (!proceed) {
      return dispose();
    }

    // The running build has to be gone from both processes before
    // `unpackExtension` touches the build directory: reinstalling the identical
    // tarball removes the very directory it was loaded from, and a new version
    // removes it once it is recorded. Its module graph stays in memory, as it
    // does after a development reload, and a new build is imported from its own
    // `<version>-<digest8>` path. The teardown is awaited for a disabled
    // extension too, whose `onDeactivate` may still be running.
    const disabling = extensionLoader.getExtensionById(validatedRequest.id)?.isEnabled ?? false;

    try {
      if (disabling) {
        await extensionLoader.setIsEnabled(validatedRequest.id, false);
      }

      await extensionLoader.whenTornDown(validatedRequest.id);
    } catch (error) {
      const message = getMessageFromError(error);

      logger.warn(`[EXTENSION-INSTALLATION]: cannot tear ${name}@${oldVersion} down to replace it: ${message}`, {
        error,
      });
      dispose();

      return void showErrorNotification(
        <div className="flex flex-col gap-2">
          <p>
            {installFailureSubject(name, version, disabling ? oldVersion : undefined, isReinstall)}
            {" has failed: "}
            <em>{message}</em>
          </p>
          {disabling && <p>{disabledForReinstallNote(name, oldVersion)}</p>}
        </div>,
      );
    }

    await unpackExtension(
      validatedRequest,
      dispose,
      disabling ? { disabledVersion: oldVersion, isReinstall } : undefined,
    );
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
      confirm: di.inject(confirmInjectable),
      showErrorNotification: di.inject(showErrorNotificationInjectable),
      logger: di.inject(loggerInjectionToken),
    }),
});

export default attemptInstallInjectable;
