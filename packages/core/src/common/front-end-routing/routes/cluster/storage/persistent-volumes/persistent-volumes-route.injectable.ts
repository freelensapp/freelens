/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const persistentVolumesRouteInjectable = getInjectable({
  id: "persistent-volumes-route",

  instantiate: (di) => ({
    path: "/persistent-volumes",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "persistentvolumes",
      group: "",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default persistentVolumesRouteInjectable;
