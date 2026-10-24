/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { loggerInjectionToken } from "@freelensapp/logger";
import {
  showErrorNotificationInjectable,
  showInfoNotificationInjectable,
  showSuccessNotificationInjectable,
} from "@freelensapp/notifications";
import { noop } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import fse from "fs-extra";
import { when } from "mobx";
import extractTarInjectable from "../../../../common/fs/extract-tar.injectable";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { extensionDisplayName, sanitizeExtensionName } from "../../../../extensions/lens-extension";
import activateInstalledBuildInjectable from "../../../../features/extensions/installer/common/activate-installed-build.injectable";
import { computeTarballDigest, shortenDigest } from "../../../../features/extensions/installer/common/checksums";
import extensionsRootInjectable from "../../../../features/extensions/installer/common/extensions-root.injectable";
import { versionDirectoryName } from "../../../../features/extensions/installer/common/version-directory";
import { getMessageFromError } from "../get-message-from-error/get-message-from-error";
import { disabledForReinstallNote, installFailureSubject } from "./disabled-for-reinstall";

import type { Disposer } from "@freelensapp/utilities";

import type { InstallRequestValidated } from "./create-temp-files-and-validate.injectable";

export interface UnpackExtensionOptions {
  /**
   * The version of the extension which was running and was disabled to make
   * way for this install. A failure says that it stays disabled.
   */
  disabledVersion?: string;
  /**
   * Whether this install is the same build again, the same version from the
   * same kind of source, rather than a replacement of it.
   */
  isReinstall?: boolean;
}

export type UnpackExtension = (
  request: InstallRequestValidated,
  disposeDownloading?: Disposer,
  options?: UnpackExtensionOptions,
) => Promise<void>;

/**
 * Turn a validated tarball into a managed install.
 *
 * Everything in the tarball is extracted, not only the code: a partial
 * extraction would give one extension's files two access paths, and an
 * extension then has a real directory to read its own resources from. The
 * tarball itself is not kept -- once extracted it has done its job, the same way
 * a `.deb` is redundant once installed -- so the digest is computed here, while
 * the bytes are still in hand.
 */
const unpackExtensionInjectable = getInjectable({
  id: "unpack-extension",
  instantiate: (di): UnpackExtension => {
    const extensionLoader = di.inject(extensionLoaderInjectable);
    const extensionsRoot = di.inject(extensionsRootInjectable);
    const activateInstalledBuild = di.inject(activateInstalledBuildInjectable);
    const extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const extractTar = di.inject(extractTarInjectable);
    const logger = di.inject(loggerInjectionToken);
    const showInfoNotification = di.inject(showInfoNotificationInjectable);
    const showSuccessNotification = di.inject(showSuccessNotificationInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);

    const displayErrorMessage = (
      message: string,
      name: string,
      version: string,
      { disabledVersion, isReinstall }: UnpackExtensionOptions,
    ) => {
      showErrorNotification(
        <div className="flex flex-col gap-2">
          <p>
            {installFailureSubject(name, version, disabledVersion, isReinstall)}
            {" has failed: "}
            <em>{message}</em>
          </p>
          {disabledVersion && <p>{disabledForReinstallNote(name, disabledVersion)}</p>}
        </div>,
      );
    };

    return async (request, disposeDownloading, options = {}) => {
      const {
        id,
        fileName,
        tempFile,
        data,
        source,
        checksum,
        manifest: { name, version },
      } = request;

      extensionInstallationStateStore.setInstalling(id);
      disposeDownloading?.();

      const displayName = extensionDisplayName(name, version);
      // The identity of this build: over the archive bytes, not over the
      // extracted tree, whose hash depends on extraction order and filesystem.
      const digest = computeTarballDigest(data);
      const buildFolder = path.join(extensionsRoot, sanitizeExtensionName(name), versionDirectoryName(version, digest));
      const unpackingTempFolder = path.join(path.dirname(tempFile), `${path.basename(tempFile)}-unpacked`);

      logger.info(`Unpacking extension ${displayName}`, { fileName, tempFile, buildFolder });

      try {
        // The checksum itself was checked in `attemptInstall`, before these
        // bytes were written out or read into: by here the only thing left to
        // say about it is that there was not one.
        if (!checksum) {
          showInfoNotification(
            <p>
              {"Nothing vouches for the integrity of "}
              <b>{displayName}</b>
              {": no checksum was available for this download. Installing it anyway."}
            </p>,
          );
        }

        // extract to temp folder first
        await fse.remove(unpackingTempFolder).catch(noop);
        await fse.ensureDir(unpackingTempFolder);
        await extractTar(tempFile, { cwd: unpackingTempFolder });

        // move contents to the build folder
        const unpackedFiles = await fse.readdir(unpackingTempFolder);
        let unpackedRootFolder = unpackingTempFolder;

        if (unpackedFiles.length === 1) {
          // check if %extension.tgz was packed with single top folder,
          // e.g. "npm pack %ext_name" downloads file with "package" root folder within tarball
          unpackedRootFolder = path.join(unpackingTempFolder, unpackedFiles[0]);
        }

        // Reinstalling the identical tarball lands on the same path, so the
        // previous content of it goes rather than being merged with.
        await fse.remove(buildFolder).catch(noop);
        await fse.ensureDir(path.dirname(buildFolder));
        await fse.move(unpackedRootFolder, buildFolder, { overwrite: true });

        await activateInstalledBuild({
          name,
          path: buildFolder,
          version,
          digest: shortenDigest(digest),
          source,
          verified: Boolean(checksum),
        });

        // wait for the loader has actually install it
        await when(() => extensionLoader.userExtensions.get().has(id), { timeout: 10000 })
          .then(async () => {
            // Enable installed extensions by default.
            await extensionLoader.setIsEnabled(id, true);

            showSuccessNotification(
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
            displayErrorMessage("There was an error during the installation", name, version, options);
          });
      } catch (error) {
        const message = getMessageFromError(error);

        logger.info(`[EXTENSION-INSTALLATION]: installing ${request.fileName} has failed: ${message}`, { error });
        displayErrorMessage(message, name, version, options);
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
