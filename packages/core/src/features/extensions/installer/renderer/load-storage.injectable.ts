/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { beforeFrameStartsSecondInjectionToken } from "../../../../renderer/before-frame-starts/tokens";
import installedExtensionsPersistentStorageInjectable from "../common/installed-extensions-storage.injectable";

const loadInstalledExtensionsStorageInjectable = getInjectable({
  id: "load-installed-extensions-storage",
  instantiate: (di) => ({
    run: () => {
      const storage = di.inject(installedExtensionsPersistentStorageInjectable);

      storage.loadAndStartSyncing();
    },
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default loadInstalledExtensionsStorageInjectable;
