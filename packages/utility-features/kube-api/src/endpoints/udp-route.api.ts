/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { UDPRoute } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class UDPRouteApi extends KubeApi<UDPRoute> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: UDPRoute,
      checkPreferredVersion: true,
      fallbackApiBases: ["/apis/gateway.networking.k8s.io/v1alpha2/udproutes"],
    });
  }
}
