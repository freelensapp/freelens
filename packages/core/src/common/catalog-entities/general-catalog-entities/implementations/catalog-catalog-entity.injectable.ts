/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import catalogRouteInjectable from "../../../front-end-routing/routes/catalog/catalog-route.injectable";
import { GeneralEntity } from "../../index";
import { generalCatalogEntityInjectionToken } from "../general-catalog-entity-injection-token";

const catalogCatalogEntityInjectable = getInjectable({
  id: "general-catalog-entity-for-catalog",

  instantiate: (di) => {
    const route = di.inject(catalogRouteInjectable);
    const url = buildURL(route.path);

    return new GeneralEntity({
      metadata: {
        uid: "catalog-entity",
        name: "Catalog",
        source: "app",
        labels: {},
      },
      spec: {
        path: url,
        icon: {
          material: "view_list",
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

export default catalogCatalogEntityInjectable;
