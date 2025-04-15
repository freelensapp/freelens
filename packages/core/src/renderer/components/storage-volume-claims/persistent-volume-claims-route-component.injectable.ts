/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import persistentVolumeClaimsRouteInjectable from "../../../common/front-end-routing/routes/cluster/storage/persistent-volume-claims/persistent-volume-claims-route.injectable";
import { routeSpecificComponentInjectionToken } from "../../routes/route-specific-component-injection-token";
import { PersistentVolumeClaims } from "./volume-claims";

const persistentVolumeClaimsRouteComponentInjectable = getInjectable({
  id: "persistent-volume-claims-route-component",

  instantiate: (di) => ({
    route: di.inject(persistentVolumeClaimsRouteInjectable),
    Component: PersistentVolumeClaims,
  }),

  injectionToken: routeSpecificComponentInjectionToken,
});

export default persistentVolumeClaimsRouteComponentInjectable;
