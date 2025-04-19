/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import os from "os";
import path from "path";
import { getInjectable } from "@ogre-tools/injectable";
import appPathsInjectable from "../app-paths.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";

const directoryForUserDataInjectable = getInjectable({
  id: "directory-for-user-data",
  instantiate: (di) => {
    if (process.env.CICD && process.env.CICD.startsWith(os.tmpdir())) {
      const appName = di.inject(appNameInjectable);

      return path.join(process.env.CICD, appName);
    }

    return di.inject(appPathsInjectable).userData;
  }
});

export default directoryForUserDataInjectable;
