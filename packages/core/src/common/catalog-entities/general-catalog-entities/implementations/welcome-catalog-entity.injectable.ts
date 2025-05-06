/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import welcomeRouteInjectable from "../../../front-end-routing/routes/welcome/welcome-route.injectable";
import { GeneralEntity } from "../../index";
import { generalCatalogEntityInjectionToken } from "../general-catalog-entity-injection-token";

const welcomeCatalogEntityInjectable = getInjectable({
  id: "general-catalog-entity-for-welcome",

  instantiate: (di) => {
    const route = di.inject(welcomeRouteInjectable);
    const url = buildURL(route.path);

    return new GeneralEntity({
      metadata: {
        uid: "welcome-page-entity",
        name: "Welcome Page",
        source: "app",
        labels: {},
      },
      spec: {
        path: url,
        icon: {
          material: "home",
          background: "var(--primary)",
        },
      },
      status: {
        phase: "active",
      },
    });
  },

  injectionToken: generalCatalogEntityInjectionToken,
});

export default welcomeCatalogEntityInjectable;
