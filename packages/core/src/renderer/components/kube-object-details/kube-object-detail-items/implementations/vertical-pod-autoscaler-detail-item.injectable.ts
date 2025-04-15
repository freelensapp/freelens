/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { VpaDetails } from "../../../config-vertical-pod-autoscalers";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const verticalPodAutoscalerDetailItemInjectable = getInjectable({
  id: "vertical-pod-autoscaler-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: VpaDetails,
      enabled: computed(() => isVerticalPodAutoscaler(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export const isVerticalPodAutoscaler = kubeObjectMatchesToKindAndApiVersion("VerticalPodAutoscaler", [
  "autoscaling.k8s.io/v1",
]);

export default verticalPodAutoscalerDetailItemInjectable;
