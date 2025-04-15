/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computedOr } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const ingressesRouteInjectable = getInjectable({
  id: "ingresses-route",

  instantiate: (di) => ({
    path: "/ingresses",
    clusterFrame: true,
    isEnabled: computedOr(
      di.inject(shouldShowResourceInjectionToken, {
        apiName: "ingresses",
        group: "networking.k8s.io",
      }),
      di.inject(shouldShowResourceInjectionToken, {
        apiName: "ingresses",
        group: "extensions",
      }),
    ),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default ingressesRouteInjectable;
