/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const backendTLSPoliciesRouteInjectable = getInjectable({
  id: "backend-tls-policies-route",

  instantiate: (di) => ({
    path: "/backend-tls-policies",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "backendtlspolicies",
      group: "gateway.networking.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default backendTLSPoliciesRouteInjectable;
