/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import installFromDirectoryInjectable from "./attempt-install/install-from-directory.injectable";
import installFromFileInjectable from "./attempt-install/install-from-file.injectable";

export type AttemptInstalls = (paths: string[]) => Promise<void>;

/**
 * Install everything that was dropped on the window or picked in the file
 * dialog. A dropped directory is a development install, the same as one typed
 * into the install field.
 */
const attemptInstallsInjectable = getInjectable({
  id: "attempt-installs",

  instantiate: (di): AttemptInstalls => {
    const installFromFile = di.inject(installFromFileInjectable);
    const installFromDirectory = di.inject(installFromDirectoryInjectable);
    const stat = di.inject(statInjectable);

    return async (paths) => {
      await Promise.allSettled(
        paths.map(async (filePath) => {
          const stats = await stat(filePath).catch(() => undefined);

          return stats?.isDirectory() ? installFromDirectory(filePath) : installFromFile(filePath);
        }),
      );
    };
  },
});

export default attemptInstallsInjectable;
