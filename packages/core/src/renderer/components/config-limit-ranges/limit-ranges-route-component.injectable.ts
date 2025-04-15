/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import limitRangesRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/limit-ranges/limit-ranges-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { LimitRanges } from "./limit-ranges";

const limitRangesRouteComponentInjectable = getInjectable({
  id: "limit-ranges-route-component",

  instantiate: (di) => ({
    route: di.inject(limitRangesRouteInjectable),
    Component: LimitRanges,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default limitRangesRouteComponentInjectable;
