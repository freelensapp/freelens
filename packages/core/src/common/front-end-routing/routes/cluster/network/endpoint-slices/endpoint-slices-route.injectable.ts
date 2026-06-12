/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const endpointSlicesRouteInjectable = getInjectable({
  id: "endpoint-slices-route",

  instantiate: (di) => ({
    path: "/endpoint-slices",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "endpointslices",
      group: "discovery.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default endpointSlicesRouteInjectable;
