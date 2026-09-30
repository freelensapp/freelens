/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { getInjectable } from "@ogre-tools/injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import { InputValidators } from "../input";
import installFromDirectoryInjectable from "./attempt-install/install-from-directory.injectable";
import installFromFileInjectable from "./attempt-install/install-from-file.injectable";
import installFromUrlInjectable from "./attempt-install/install-from-url.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import { getMessageFromError } from "./get-message-from-error/get-message-from-error";

export type InstallExtensionFromInput = (input: string) => Promise<void>;

/**
 * Only `http:` and `https:` are downloads. `InputValidators.isUrl` accepts
 * anything `new URL` parses, and that includes a Windows drive path such as
 * `C:\extensions\my-extension`, whose protocol is `c:`; such input has to reach
 * the filesystem instead.
 */
const isDownloadUrl = (input: string) => {
  try {
    const { protocol } = new URL(input);

    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * The one install verb, with the source inferred from the argument.
 *
 * Four shapes: a package name, resolved against the registry; an `http(s)` URL; a path to a
 * `.tgz`; and a path to a directory. The first three produce a managed copy, the
 * fourth registers the extension in place.
 */
const installExtensionFromInputInjectable = getInjectable({
  id: "install-extension-from-input",

  instantiate: (di): InstallExtensionFromInput => {
    const installFromUrl = di.inject(installFromUrlInjectable);
    const installFromFile = di.inject(installFromFileInjectable);
    const installFromDirectory = di.inject(installFromDirectoryInjectable);
    const attemptInstallByInfo = di.inject(attemptInstallByInfoInjectable);
    const stat = di.inject(statInjectable);
    const showErrorNotification = di.inject(showErrorNotificationInjectable);
    const logger = di.inject(loggerInjectionToken);

    return async (input) => {
      try {
        if (isDownloadUrl(input)) {
          return await installFromUrl(input);
        }

        const stats = await stat(input).catch(() => undefined);

        if (stats) {
          return await (stats.isDirectory() ? installFromDirectory(input) : installFromFile(input));
        }

        const extNameCaptures = InputValidators.extensionNameInstallCaptures(input);

        if (extNameCaptures) {
          const { name, version } = extNameCaptures;

          return await attemptInstallByInfo({ name, version });
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
      }
    };
  },
});

export default installExtensionFromInputInjectable;
