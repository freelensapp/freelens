/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import loadUserPreferencesStorageInjectable from "../../../user-preferences/main/load-storage.injectable";
import clustersPersistentStorageInjectable from "../common/storage.injectable";

const initClusterStoreInjectable = getInjectable({
  id: "init-cluster-store",
  instantiate: (di) => ({
    run: () => {
      const storage = di.inject(clustersPersistentStorageInjectable);

      storage.loadAndStartSyncing();
    },
    runAfter: loadUserPreferencesStorageInjectable,
  }),
  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default initClusterStoreInjectable;
