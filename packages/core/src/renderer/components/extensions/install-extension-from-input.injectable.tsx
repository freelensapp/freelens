/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import extensionInstallationStateStoreInjectable from "../../../extensions/extension-installation-state-store/extension-installation-state-store.injectable";
import downloadBinaryViaChannelInjectable from "../../../renderer/fetch/download-binary-via-channel.injectable";
import { InputValidators } from "../input";
import attemptInstallInjectable from "./attempt-install/attempt-install.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import { getMessageFromError } from "./get-message-from-error/get-message-from-error";
import readFileNotifyInjectable from "./read-file-notify/read-file-notify.injectable";

import type { ExtendableDisposer } from "@freelensapp/utilities";

export type InstallExtensionFromInput = (input: string) => Promise<void>;

const installExtensionFromInputInjectable = getInjectable({
  id: "install-extension-from-input",

  instantiate: (di): InstallExtensionFromInput => {
    const attemptInstall = di.inject(attemptInstallInjectable);
    const attemptInstallByInfo = di.inject(attemptInstallByInfoInjectable);
    const extensionInstallationStateStore = di.inject(extensionInstallationStateStoreInjectable);
    const readFileNotify = di.inject(readFileNotifyInjectable);
    const getBasenameOfPath = di.inject(getBasenameOfPathInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);
    const downloadBinary = di.inject(downloadBinaryViaChannelInjectable);

    return async (input) => {
      let disposer: ExtendableDisposer | undefined = undefined;

      try {
        // fixme: improve error messages for non-tar-file URLs
        if (InputValidators.isUrl.validate(input)) {
          // install via url
          disposer = extensionInstallationStateStore.startPreInstall();
          const result = await downloadBinary(input, { timeout: 30_0000 });

          if (!result.callWasSuccessful) {
            showErrorNotification(`Failed to download extension: ${result.error}`);

            return disposer();
          }

          const fileName = getBasenameOfPath(input);

          return await attemptInstall({ fileName, data: result.response }, disposer);
        }

        try {
          await InputValidators.isPath.validate(input);

          // install from system path
          const fileName = getBasenameOfPath(input);
          const data = await readFileNotify(input);

          if (!data) {
            return;
          }

          return await attemptInstall({ fileName, data });
        } catch (error) {
          const extNameCaptures = InputValidators.isExtensionNameInstallRegex.captures(input);

          if (extNameCaptures) {
            const { name, version } = extNameCaptures;

            return await attemptInstallByInfo({ name, version });
          }
        }

        throw new Error(`Unknown format of input: ${input}`);
      } catch (error) {
        const message = getMessageFromError(error);

        logger.info(`[EXTENSION-INSTALL]: installation has failed: ${message}`, { error, installPath: input });
        showErrorNotification(
          <p>
            {"Installation has failed: "}
            <b>{message}</b>
          </p>,
        );
      } finally {
        disposer?.();
      }
    };
  },
});

export default installExtensionFromInputInjectable;
