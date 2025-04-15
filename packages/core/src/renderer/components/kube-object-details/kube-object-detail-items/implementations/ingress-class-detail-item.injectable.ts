/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { IngressClassDetails } from "../../../network-ingresses";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const ingressClassDetailItemInjectable = getInjectable({
  id: "ingress-class-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: IngressClassDetails,
      enabled: computed(() => isIngressClass(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export const isIngressClass = kubeObjectMatchesToKindAndApiVersion("IngressClass", [
  "networking.k8s.io/v1",
  "extensions/v1beta1",
]);

export default ingressClassDetailItemInjectable;
