/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { BackendTLSPolicyDetails } from "../../../gateway-api/backend-tls-policies/backend-tls-policy-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isBackendTLSPolicy = kubeObjectMatchesToKindAndApiVersion("BackendTLSPolicy", [
  "gateway.networking.k8s.io/v1alpha3",
]);

const backendTlsPolicyDetailItemInjectable = getInjectable({
  id: "backend-tls-policy-detail-item",
  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: BackendTLSPolicyDetails,
      enabled: computed(() => isBackendTLSPolicy(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default backendTlsPolicyDetailItemInjectable;
