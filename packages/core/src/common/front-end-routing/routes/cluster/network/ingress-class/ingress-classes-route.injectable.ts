/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const ingressClassesRouteInjectable = getInjectable({
  id: "ingress-classes-route",

  instantiate: (di) => ({
    path: "/ingress-classes",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "ingressclasses",
      group: "networking.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default ingressClassesRouteInjectable;
