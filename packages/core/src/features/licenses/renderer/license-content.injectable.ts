/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import readFileInjectable from "../../../common/fs/read-file.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import staticFilesDirectoryInjectable from "../../../common/vars/static-files-directory.injectable";

const licenseContentInjectable = getInjectable({
  id: "license-content",

  instantiate: (di) => {
    const readFile = di.inject(readFileInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const staticFilesDirectory = di.inject(staticFilesDirectoryInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        try {
          const licenseFilePath = joinPaths(staticFilesDirectory, "build/license.txt");
          return await readFile(licenseFilePath);
        } catch (error) {
          return `Error loading license file: ${error}`;
        }
      },
      valueWhenPending: "Loading...",
    });
  },
});

export default licenseContentInjectable;
