/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable, showInfoNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import { when } from "mobx";
import readJsonFileInjectable from "../../../../common/fs/read-json-file.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import { ExtensionInstallationState } from "../../../../extensions/extension-installation-state-store/extension-installation-state-store";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { extensionDisplayName } from "../../../../extensions/lens-extension";
import activateInstalledBuildInjectable from "../../../../features/extensions/installer/common/activate-installed-build.injectable";
import { manifestFilename, validateExtensionManifest } from "../../../../features/extensions/installer/common/manifest";
import confirmInjectable from "../../confirm-dialog/confirm.injectable";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import { disabledForReinstallNote, installFailureSubject } from "./disabled-for-reinstall";

export type InstallFromDirectory = (directory: string) => Promise<void>;

/**
 * Register an already-unpacked extension in place.
 *
 * This is the development mode, which is why there are no symlinks anywhere in
 * this model: the author points Freelens at the package root once and works.
 * Nothing is copied, so nothing is verifiable -- such an extension is unverified
 * by construction, and is shown as such.
 */
const installFromDirectoryInjectable = getInjectable({
  id: "install-from-directory",

  instantiate: (di): InstallFromDirectory => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const activateInstalledBuild = di.inject(activateInstalledBuildInjectable);
    const installStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const readJsonFile = di.inject(readJsonFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const confirm = di.inject(confirmInjectable);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (directory) => {
      const dispose = installStateStore.startPreInstall();

      try {
        const manifestPath = joinPaths(directory, manifestFilename);
        let manifest;

        try {
          manifest = validateExtensionManifest(await readJsonFile(manifestPath));
        } catch (error) {
          const message = getMessageFromError(error);

          logger.info(`[EXTENSION-INSTALL]: ${directory} is not an extension: ${message}`, { error });
          showErrorNotification(
            <p>
              <em>{directory}</em>
              {" is not an extension: "}
              <em>{message}</em>
            </p>,
          );

          return;
        }

        const id = manifest.name;
        const displayName = extensionDisplayName(manifest.name, manifest.version);
        const currentState = installStateStore.getInstallationState(id);

        if (currentState !== ExtensionInstallationState.IDLE) {
          return void showErrorNotification(
            <p>
              {"The "}
              <em>{manifest.name}</em>
              {` extension is currently ${currentState.toLowerCase()}.`}
            </p>,
          );
        }

        const installedExtension = extensionLoader.getExtensionById(id);
        const isLoadedFromHere =
          installedExtension?.isManaged === false && installedExtension.absolutePath === directory;

        // Registering it again would change nothing: the directory is already
        // what runs, and a rebuild in it is reloaded on its own.
        if (installedExtension?.isEnabled && isLoadedFromHere) {
          return void showInfoNotification(
            <p>
              {"Extension "}
              <b>{extensionDisplayName(manifest.name, installedExtension.manifest.version)}</b>
              {" is already loaded from "}
              <code>{directory}</code>
              {", and is reloaded whenever it is rebuilt there."}
            </p>,
          );
        }

        const replaced = installedExtension && !isLoadedFromHere ? installedExtension : undefined;
        // A directory in place of what is enabled is always a replacement, even
        // of the same version: the build is not the same, and neither is its
        // verification. The directory already loaded is handled above.
        const enabledVersion = replaced?.isEnabled ? replaced.manifest.version : undefined;

        const proceed = await confirm({
          message: (
            <div className="flex flex-col gap-2">
              <p>
                {!enabledVersion ? (
                  <>
                    {"Load the extension "}
                    <b>{displayName}</b>
                  </>
                ) : (
                  <>
                    {"Replace "}
                    <b>{extensionDisplayName(manifest.name, enabledVersion)}</b>
                    {replaced?.isManaged === false && (
                      <>
                        {" from "}
                        <code>{replaced.absolutePath}</code>
                      </>
                    )}
                    {" with "}
                    <b>{displayName}</b>
                  </>
                )}
                {" from "}
                <code>{directory}</code>?
              </p>
              <p>
                {"It stays where it is and is loaded from there, so it is not verified and changes with the directory."}
              </p>
              {replaced && (
                <p>
                  <b>Warning:</b>
                  {enabledVersion
                    ? ` ${manifest.name}@${enabledVersion} is enabled and will be disabled and replaced by ${displayName}.`
                    : ` ${manifest.name}@${replaced.manifest.version} will be replaced by this installation.`}
                </p>
              )}
            </div>
          ),
          labelCancel: "Cancel",
          labelOk: enabledVersion ? "Replace" : "Install",
        });

        if (!proceed) {
          return;
        }

        installStateStore.setInstalling(id);

        // Read again: the extension may have been enabled or disabled while
        // the dialog was open.
        const installedNow = extensionLoader.getExtensionById(id);
        const disabledVersion = installedNow?.isEnabled ? installedNow.manifest.version : undefined;

        try {
          // The build which ran has to be gone from both processes before
          // `activateInstalledBuild` records this directory in its place,
          // which removes the directory of a managed build. See
          // `attemptInstall`.
          if (installedNow) {
            if (disabledVersion) {
              await extensionLoader.setIsEnabled(id, false);
            }

            await extensionLoader.whenTornDown(id);
          }

          await activateInstalledBuild({
            name: id,
            path: directory,
            source: { kind: "directory", path: directory },
            verified: false,
          });

          await when(() => extensionLoader.userExtensions.get().has(id), { timeout: 10_000 });

          await extensionLoader.setIsEnabled(id, true);

          showInfoNotification(
            <p>
              {"Extension "}
              <b>{displayName}</b>
              {" is now loaded from "}
              <code>{directory}</code>.
            </p>,
          );
        } catch (error) {
          const message = getMessageFromError(error);

          logger.info(`[EXTENSION-INSTALL]: registering ${directory} has failed: ${message}`, { error });
          showErrorNotification(
            <div className="flex flex-col gap-2">
              <p>
                {installFailureSubject(manifest.name, manifest.version, disabledVersion)}
                {" has failed: "}
                <em>{message}</em>
              </p>
              {disabledVersion && <p>{disabledForReinstallNote(manifest.name, disabledVersion)}</p>}
            </div>,
          );
        } finally {
          installStateStore.clearInstalling(id);
        }
      } finally {
        dispose();
      }
    };
  },
});

export default installFromDirectoryInjectable;
