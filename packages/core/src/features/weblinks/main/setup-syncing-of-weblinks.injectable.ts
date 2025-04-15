/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { iter } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import catalogEntityRegistryInjectable from "../../../main/catalog/entity-registry.injectable";
import weblinkVerificationStartableStoppableInjectable from "./weblink-verification.injectable";
import weblinkVerificationsInjectable from "./weblink-verifications.injectable";

const setupSyncingOfWeblinksInjectable = getInjectable({
  id: "setup-syncing-of-weblinks",

  instantiate: (di) => ({
    run: () => {
      const weblinkVerificationStartableStoppable = di.inject(weblinkVerificationStartableStoppableInjectable);
      const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
      const weblinkVerifications = di.inject(weblinkVerificationsInjectable);

      weblinkVerificationStartableStoppable.start();
      catalogEntityRegistry.addComputedSource(
        "weblinks",
        computed(() =>
          iter
            .chain(weblinkVerifications.values())
            .map(([weblink]) => weblink)
            .toArray(),
        ),
      );
    },
  }),

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default setupSyncingOfWeblinksInjectable;
