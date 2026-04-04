/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const grpcRoutesRouteInjectable = getInjectable({
  id: "grpc-routes-route",

  instantiate: (di) => ({
    path: "/grpc-routes",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "grpcroutes",
      group: "gateway.networking.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default grpcRoutesRouteInjectable;
