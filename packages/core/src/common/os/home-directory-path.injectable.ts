/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import os from "os";
import path from "path";
import { getInjectable } from "@ogre-tools/injectable";
import appNameInjectable from "../vars/app-name.injectable";
import userInfoInjectable from "../vars/user-info.injectable";

const homeDirectoryPathInjectable = getInjectable({
  id: "home-directory-path",
  instantiate: (di) => {
    if (process.env.CICD && process.env.CICD.startsWith(os.tmpdir())) {
      const appName = di.inject(appNameInjectable);

      return path.join(process.env.CICD, appName, "home");
    }

    return di.inject(userInfoInjectable).homedir;
  },
});

export default homeDirectoryPathInjectable;
