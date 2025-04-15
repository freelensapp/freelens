/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import catalogRouteInjectable from "../../../common/front-end-routing/routes/catalog/catalog-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Catalog } from "./catalog";

const catalogRouteComponentInjectable = getInjectable({
  id: "catalog-route-component",

  instantiate: (di) => ({
    route: di.inject(catalogRouteInjectable),
    Component: Catalog,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default catalogRouteComponentInjectable;
