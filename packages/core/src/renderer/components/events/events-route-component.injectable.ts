/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import eventsRouteInjectable from "../../../common/front-end-routing/routes/cluster/events/events-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Events } from "./events";

const eventsRouteComponentInjectable = getInjectable({
  id: "events-route-component",

  instantiate: (di) => ({
    route: di.inject(eventsRouteInjectable),
    Component: Events,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default eventsRouteComponentInjectable;
