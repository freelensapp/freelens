/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import referenceGrantsRouteInjectable from "../../../common/front-end-routing/routes/cluster/network/reference-grants/reference-grants-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { ReferenceGrants } from "./reference-grants";

const referenceGrantsRouteComponentInjectable = getInjectable({
  id: "reference-grants-route-component",

  instantiate: (di) => ({
    route: di.inject(referenceGrantsRouteInjectable),
    Component: ReferenceGrants,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default referenceGrantsRouteComponentInjectable;
