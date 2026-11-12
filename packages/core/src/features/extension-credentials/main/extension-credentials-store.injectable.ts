/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../common/fs/fs.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import isLinuxInjectable from "../../../common/vars/is-linux.injectable";
import electronAppInjectable from "../../../main/electron-app/electron-app.injectable";
import { extensionCredentialsBackendInjectionToken } from "../common/extension-credentials-backend-injection-token";
import { ExtensionCredentialsStore } from "./extension-credentials-store";
import safeStorageInjectable from "./safe-storage.injectable";

const extensionCredentialsStoreInjectable = getInjectable({
  id: "extension-credentials-store",
  instantiate: (di) => {
    const fs = di.inject(fsInjectable);
    const electronApp = di.inject(electronAppInjectable);
    const joinPaths = di.inject(joinPathsInjectable);

    return new ExtensionCredentialsStore({
      directory: joinPaths(di.inject(directoryForUserDataInjectable), "extension-credentials"),
      safeStorage: di.inject(safeStorageInjectable),
      fs: {
        readFile: (path, encoding) => fs.readFile(path, encoding),
        writeFile: (path, data, options) => fs.writeFile(path, data, options),
        rename: (oldPath, newPath) => fs.rename(oldPath, newPath),
        rm: (path, options) => fs.rm(path, options),
        mkdir: (path, { mode }) => fs.ensureDir(path, { mode }),
      },
      isLinux: di.inject(isLinuxInjectable),
      logger: di.inject(loggerInjectionToken),
      whenReady: () => electronApp.whenReady(),
      getRandomId: di.inject(getRandomIdInjectionToken),
    });
  },
  injectionToken: extensionCredentialsBackendInjectionToken,
});

export default extensionCredentialsStoreInjectable;
