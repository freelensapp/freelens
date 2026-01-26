/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { GatewayClass } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class GatewayClassApi extends KubeApi<GatewayClass> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: GatewayClass,
      checkPreferredVersion: true,
      fallbackApiBases: ["/apis/gateway.networking.k8s.io/v1beta1/gatewayclasses"],
    });
  }
}
