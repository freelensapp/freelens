/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { MutatingAdmissionPolicy } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class MutatingAdmissionPolicyApi extends KubeApi<MutatingAdmissionPolicy> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: MutatingAdmissionPolicy,
      // Served as v1alpha1 or v1beta1 behind a feature gate before Kubernetes 1.36
      checkPreferredVersion: true,
    });
  }
}
