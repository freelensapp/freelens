/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import disconnectClustersRemovedFromCatalogInjectable from "./disconnect-clusters-removed-from-catalog.injectable";

const startDisconnectingClustersRemovedFromCatalogInjectable = getInjectable({
  id: "start-disconnecting-clusters-removed-from-catalog",
  instantiate: (di) => ({
    run: () => {
      di.inject(disconnectClustersRemovedFromCatalogInjectable).start();
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default startDisconnectingClustersRemovedFromCatalogInjectable;
