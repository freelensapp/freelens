/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { BackendLBPolicy } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class BackendLBPolicyApi extends KubeApi<BackendLBPolicy> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: BackendLBPolicy,
      checkPreferredVersion: true,
      fallbackApiBases: ["/apis/gateway.networking.k8s.io/v1alpha2/backendlbpolicies"],
    });
  }
}
