/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { beforeFrameStartsSecondInjectionToken } from "../../../renderer/before-frame-starts/tokens";
import initClusterStoreInjectable from "../../cluster/storage/renderer/init.injectable";
import favoritesPersistentStorageInjectable from "../common/storage.injectable";

const loadFavoritesStorageInjectable = getInjectable({
  id: "load-favorites-storage",
  instantiate: (di) => ({
    run: () => {
      const storage = di.inject(favoritesPersistentStorageInjectable);

      storage.loadAndStartSyncing();
    },
    runAfter: initClusterStoreInjectable,
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default loadFavoritesStorageInjectable;
