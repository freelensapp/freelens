/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { HTTPRouteDetails } from "../../../gateway-api/http-routes/http-route-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isHTTPRoute = kubeObjectMatchesToKindAndApiVersion("HTTPRoute", [
  "gateway.networking.k8s.io/v1",
  "gateway.networking.k8s.io/v1beta1",
]);

const httpRouteDetailItemInjectable = getInjectable({
  id: "http-route-detail-item",
  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: HTTPRouteDetails,
      enabled: computed(() => isHTTPRoute(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default httpRouteDetailItemInjectable;
