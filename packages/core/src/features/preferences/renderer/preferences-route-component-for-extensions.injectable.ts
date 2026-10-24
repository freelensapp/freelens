/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import preferencesRouteForExtensions from "../common/preferences-route-for-extensions.injectable";
import { Preferences } from "./preferences";

const preferencesRouteComponentInjectable = getInjectable({
  id: "preferences-route-component-for-extensions",

  instantiate: (di) => ({
    route: di.inject(preferencesRouteForExtensions),
    Component: Preferences,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default preferencesRouteComponentInjectable;
