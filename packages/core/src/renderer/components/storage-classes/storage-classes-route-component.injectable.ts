/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import storageClassesRouteInjectable from "../../../common/front-end-routing/routes/cluster/storage/storage-classes/storage-classes-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { StorageClasses } from "./storage-classes";

const storageClassesRouteComponentInjectable = getInjectable({
  id: "storage-classes-route-component",

  instantiate: (di) => ({
    route: di.inject(storageClassesRouteInjectable),
    Component: StorageClasses,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default storageClassesRouteComponentInjectable;
