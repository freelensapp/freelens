/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import licensesRouteInjectable from "../common/licenses-route.injectable";
import { Licenses } from "./licenses";

const licensesRouteComponentInjectable = getInjectable({
  id: "licenses-route-component",

  instantiate: (di) => ({
    route: di.inject(licensesRouteInjectable),
    Component: Licenses,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default licensesRouteComponentInjectable;
