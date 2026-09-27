/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import getBasenameOfPathInjectable from "../../../../common/path/get-basename.injectable";
import extensionInstallationStateStoreInjectable from "../../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import { parseChecksumSidecar } from "../../../../features/extensions/installer/common/checksums";
import downloadBinaryViaChannelInjectable from "../../../fetch/download-binary-via-channel.injectable";
import attemptInstallInjectable from "./attempt-install.injectable";

import type { InstallChecksum } from "../../../../features/extensions/installer/common/checksums";

export type InstallFromUrl = (url: string) => Promise<void>;

const sidecarSuffix = ".sha256";

/**
 * Install a tarball from an `http(s)` URL.
 *
 * The checksum comes from a `.tgz.sha256` sidecar beside it, the convention
 * kubectl and others already use. It is optional: a missing sidecar leaves the
 * download unverified, which is a warning rather than a refusal. It proves
 * transfer integrity and not authenticity either way, since a host which can
 * rewrite the tarball can rewrite the sidecar.
 */
const installFromUrlInjectable = getInjectable({
  id: "install-from-url",

  instantiate: (di): InstallFromUrl => {
    const attemptInstall = di.inject(attemptInstallInjectable);
    const downloadBinary = di.inject(downloadBinaryViaChannelInjectable);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const installStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);

    const downloadChecksum = async (url: string, fileName: string): Promise<InstallChecksum | undefined> => {
      const sidecarUrl = new URL(url);

      sidecarUrl.pathname += sidecarSuffix;

      const result = await downloadBinary(sidecarUrl.href, { timeout: 15_000 });

      if (!result.callWasSuccessful) {
        logger.info(`[EXTENSION-INSTALL]: no checksum at ${sidecarUrl.href}: ${result.error}`);

        return undefined;
      }

      const value = parseChecksumSidecar(result.response.toString("utf-8"), fileName);

      if (!value) {
        logger.info(`[EXTENSION-INSTALL]: the checksum at ${sidecarUrl.href} says nothing about ${fileName}`);
      }

      return value ? { kind: "sha256", value } : undefined;
    };

    return async (url) => {
      const dispose = installStateStore.startPreInstall();
      const result = await downloadBinary(url, { timeout: 300_000 });

      if (!result.callWasSuccessful) {
        showErrorNotification(`Failed to download extension: ${result.error}`);

        return dispose();
      }

      // Only used to name the temporary file, so a URL which ends in a slash
      // still has to produce something.
      const fileName = getBasenameOfPath(new URL(url).pathname) || "extension.tgz";

      return attemptInstall(
        {
          fileName,
          data: result.response,
          source: { kind: "url", url },
          checksum: await downloadChecksum(url, fileName),
        },
        dispose,
      );
    };
  },
});

export default installFromUrlInjectable;
