/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { TLSRouteDetails } from "../../../gateway-api/tls-routes/tls-route-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isTLSRoute = kubeObjectMatchesToKindAndApiVersion("TLSRoute", ["gateway.networking.k8s.io/v1alpha2"]);

const tlsRouteDetailItemInjectable = getInjectable({
  id: "tls-route-detail-item",
  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: TLSRouteDetails,
      enabled: computed(() => isTLSRoute(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default tlsRouteDetailItemInjectable;
