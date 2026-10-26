/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import pathExistsInjectable from "../../../../common/fs/path-exists.injectable";
import readFileInjectable from "../../../../common/fs/read-file.injectable";
import getBasenameOfPathInjectable from "../../../../common/path/get-basename.injectable";
import { parseChecksumSidecar } from "../../../../features/extensions/installer/common/checksums";
import readFileNotifyInjectable from "../read-file-notify/read-file-notify.injectable";
import attemptInstallInjectable from "./attempt-install.injectable";

import type { InstallChecksum } from "../../../../features/extensions/installer/common/checksums";

export type InstallFromFile = (filePath: string) => Promise<void>;

const sidecarSuffix = ".sha256";

/**
 * Install a tarball already on the filesystem, from the install field, the file
 * dialog or a drop.
 *
 * As with a URL install the checksum comes from an optional `.tgz.sha256`
 * sidecar beside the tarball, and its absence warns rather than refuses. That is
 * the common case for an author installing their own build.
 */
const installFromFileInjectable = getInjectable({
  id: "install-from-file",

  instantiate: (di): InstallFromFile => {
    const attemptInstall = di.inject(attemptInstallInjectable);
    const readFileNotify = di.inject(readFileNotifyInjectable);
    const readFile = di.inject(readFileInjectable);
    const pathExists = di.inject(pathExistsInjectable);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const logger = di.inject(loggerInjectionToken);

    const readChecksum = async (filePath: string): Promise<InstallChecksum | undefined> => {
      const sidecarPath = `${filePath}${sidecarSuffix}`;

      try {
        if (!(await pathExists(sidecarPath))) {
          return undefined;
        }

        const value = parseChecksumSidecar(await readFile(sidecarPath), getBasenameOfPath(filePath));

        if (!value) {
          logger.info(`[EXTENSION-INSTALL]: the checksum at ${sidecarPath} says nothing about ${filePath}`);
        }

        return value ? { kind: "sha256", value } : undefined;
      } catch (error) {
        logger.info(`[EXTENSION-INSTALL]: cannot read the checksum at ${sidecarPath}: ${error}`);

        return undefined;
      }
    };

    return async (filePath) => {
      const data = await readFileNotify(filePath);

      if (!data) {
        return;
      }

      return attemptInstall({
        fileName: getBasenameOfPath(filePath),
        data,
        source: { kind: "file", path: filePath },
        checksum: await readChecksum(filePath),
      });
    };
  },
});

export default installFromFileInjectable;
