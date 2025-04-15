/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import clusterManagerInjectable from "./manager.injectable";

const initializeClusterManagerInjectable = getInjectable({
  id: "initialize-cluster-manager",
  instantiate: (di) => ({
    run: () => {
      const clusterManager = di.inject(clusterManagerInjectable);

      clusterManager.init();
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
  causesSideEffects: true,
});

export default initializeClusterManagerInjectable;
