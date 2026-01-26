/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { BackendTLSPolicy } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class BackendTLSPolicyApi extends KubeApi<BackendTLSPolicy> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: BackendTLSPolicy,
      checkPreferredVersion: true,
      fallbackApiBases: [
        "/apis/gateway.networking.k8s.io/v1alpha2/backendlbspolicies",
        "/apis/gateway.networking.k8s.io/v1beta1/backendlbspolicies",
      ],
    });
  }
}
