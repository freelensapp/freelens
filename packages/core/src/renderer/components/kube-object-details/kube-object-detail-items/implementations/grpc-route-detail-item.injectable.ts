/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { GRPCRouteDetails } from "../../../gateway-api/grpc-routes/grpc-route-details";
import currentKubeObjectInDetailsInjectable from "../../current-kube-object-in-details.injectable";
import { kubeObjectDetailItemInjectionToken } from "../kube-object-detail-item-injection-token";
import { kubeObjectMatchesToKindAndApiVersion } from "../kube-object-matches-to-kind-and-api-version";

const isGRPCRoute = kubeObjectMatchesToKindAndApiVersion("GRPCRoute", ["gateway.networking.k8s.io/v1"]);

const grpcRouteDetailItemInjectable = getInjectable({
  id: "grpc-route-detail-item",
  instantiate: (di) => {
    const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

    return {
      Component: GRPCRouteDetails,
      enabled: computed(() => isGRPCRoute(kubeObject.value.get()?.object)),
      orderNumber: 10,
    };
  },
  injectionToken: kubeObjectDetailItemInjectionToken,
});

export default grpcRouteDetailItemInjectable;
