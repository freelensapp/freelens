/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import staticFilesDirectoryInjectable from "../../../../common/vars/static-files-directory.injectable";
import createLensWindowInjectable from "../application-window/create-lens-window.injectable";

const splashWindowInjectable = getInjectable({
  id: "splash-window",

  instantiate: (di) => {
    const createLensWindow = di.inject(createLensWindowInjectable);
    const staticFilesDirectory = di.inject(staticFilesDirectoryInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const splashWindowFile = joinPaths(staticFilesDirectory, "splash.html");

    return createLensWindow({
      id: "splash",
      title: "Loading",
      getContentSource: () => ({
        file: splashWindowFile,
      }),
      defaultWidth: 500,
      defaultHeight: 300,
      resizable: false,
      windowFrameUtilitiesAreShown: false,
      centered: true,
    });
  },
});

export default splashWindowInjectable;
