/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import defaultWelcomeRouteInjectable from "../../../common/front-end-routing/routes/welcome/default-welcome-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Welcome } from "./welcome";

const defaultWelcomeRouteComponentInjectable = getInjectable({
  id: "default-welcome-route-component",

  instantiate: (di) => ({
    route: di.inject(defaultWelcomeRouteInjectable),
    Component: Welcome,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default defaultWelcomeRouteComponentInjectable;
