/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { GRPCRoute } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class GRPCRouteApi extends KubeApi<GRPCRoute> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: GRPCRoute,
      checkPreferredVersion: true,
      fallbackApiBases: ["/apis/gateway.networking.k8s.io/v1beta1/grpcroutes"],
    });
  }
}
