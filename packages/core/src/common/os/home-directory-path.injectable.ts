/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import os from "os";
import path from "path";
import appNameInjectable from "../vars/app-name.injectable";
import userInfoInjectable from "../vars/user-info.injectable";

const homeDirectoryPathInjectable = getInjectable({
  id: "home-directory-path",
  instantiate: (di) => {
    if (
      process.env.FREELENS_INTEGRATION_TESTING_DIR &&
      process.env.FREELENS_INTEGRATION_TESTING_DIR.startsWith(os.tmpdir())
    ) {
      const appName = di.inject(appNameInjectable);

      return path.join(process.env.FREELENS_INTEGRATION_TESTING_DIR, appName, "home");
    }

    return di.inject(userInfoInjectable).homedir;
  },
});

export default homeDirectoryPathInjectable;
