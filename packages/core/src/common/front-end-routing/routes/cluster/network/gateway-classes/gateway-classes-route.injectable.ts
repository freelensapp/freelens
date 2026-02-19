/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const gatewayClassesRouteInjectable = getInjectable({
  id: "gateway-classes-route",

  instantiate: (di) => ({
    path: "/gateway-classes",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "gatewayclasses",
      group: "gateway.networking.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default gatewayClassesRouteInjectable;
