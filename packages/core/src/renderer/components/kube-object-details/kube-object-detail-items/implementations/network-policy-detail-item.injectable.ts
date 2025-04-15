/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { NetworkPolicyDetails } from "../../../network-policies";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const networkPolicyDetailItemInjectable = getInjectable({
  id: "network-policy-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: NetworkPolicyDetails,
      enabled: computed(() => isNetworkPolicy(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export const isNetworkPolicy = kubeObjectMatchesToKindAndApiVersion("NetworkPolicy", ["networking.k8s.io/v1"]);

export default networkPolicyDetailItemInjectable;
