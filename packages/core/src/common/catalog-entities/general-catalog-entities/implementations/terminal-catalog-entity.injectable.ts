/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { buildURL } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import terminalRouteInjectable from "../../../front-end-routing/routes/terminal/terminal-route.injectable";
import { GeneralEntity } from "../../index";
import { generalCatalogEntityInjectionToken } from "../general-catalog-entity-injection-token";

/**
 * Being a normal entity, this can also be pinned to the hotbar.
 */
const terminalCatalogEntityInjectable = getInjectable({
  id: "general-catalog-entity-for-terminal",

  instantiate: (di) => {
    const route = di.inject(terminalRouteInjectable);
    const url = buildURL(route.path);

    return new GeneralEntity({
      metadata: {
        uid: "terminal-page-entity",
        name: "Terminal",
        source: "app",
        labels: {},
      },
      spec: {
        path: url,
        icon: {
          material: "terminal",
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

export default terminalCatalogEntityInjectable;
