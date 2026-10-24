/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { shouldShowResourceInjectionToken } from "../../../../../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import { frontEndRouteInjectionToken } from "../../../../front-end-route-injection-token";

const mutatingAdmissionPolicyBindingsRouteInjectable = getInjectable({
  id: "mutatingadmissionpolicybindings",

  instantiate: (di) => ({
    path: "/mutatingadmissionpolicybindings",
    clusterFrame: true,
    isEnabled: di.inject(shouldShowResourceInjectionToken, {
      apiName: "mutatingadmissionpolicybindings",
      group: "admissionregistration.k8s.io",
    }),
  }),

  injectionToken: frontEndRouteInjectionToken,
});

export default mutatingAdmissionPolicyBindingsRouteInjectable;
