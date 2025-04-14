/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import path from "path";
import { getInjectable } from "@ogre-tools/injectable";
import userInfoInjectable from "../vars/user-info.injectable";

const kubeDirectoryPathInjectable = getInjectable({
  id: "kube-directory-path",
  instantiate: (di) => {
    return path.join(di.inject(userInfoInjectable).homedir, ".kube");
  },
});

export default kubeDirectoryPathInjectable;
