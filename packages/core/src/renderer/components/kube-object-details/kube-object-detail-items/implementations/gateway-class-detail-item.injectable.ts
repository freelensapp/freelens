/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { GatewayClassDetails } from "../../../gateway-api/gateway-classes/gateway-class-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isGatewayClass = kubeObjectMatchesToKindAndApiVersion("GatewayClass", [
  "gateway.networking.k8s.io/v1",
  "gateway.networking.k8s.io/v1beta1",
]);

const gatewayClassDetailItemInjectable = getInjectable({
  id: "gateway-class-detail-item",

  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: GatewayClassDetails,
      enabled: computed(() => isGatewayClass(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },

  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default gatewayClassDetailItemInjectable;
