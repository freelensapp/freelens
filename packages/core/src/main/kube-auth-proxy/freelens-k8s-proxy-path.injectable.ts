/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import bundledBinaryPathInjectable from "../../common/utils/bundled-binary-path.injectable";

const freeLensK8sProxyPathInjectable = getInjectable({
  id: "freelens-k8s-proxy-path",
  instantiate: (di) => {
    const path = di.inject(bundledBinaryPathInjectable, "freelens-k8s-proxy");
    return path;
  },
});

export default freeLensK8sProxyPathInjectable;
