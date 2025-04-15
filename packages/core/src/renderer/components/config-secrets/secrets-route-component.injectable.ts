/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import secretsRouteInjectable from "../../../common/front-end-routing/routes/cluster/config/secrets/secrets-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { Secrets } from "./secrets";

const secretsRouteComponentInjectable = getInjectable({
  id: "secrets-route-component",

  instantiate: (di) => ({
    route: di.inject(secretsRouteInjectable),
    Component: Secrets,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default secretsRouteComponentInjectable;
