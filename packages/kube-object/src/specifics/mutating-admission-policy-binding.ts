/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { ClusterScopedMetadata } from "../api-types";
import type { MatchResources } from "./validating-admission-policy";
import type { ParamRef } from "./validating-admission-policy-binding";

export interface MutatingAdmissionPolicyBindingSpec {
  policyName?: string;
  paramRef?: ParamRef;
  matchResources?: MatchResources;
}

export class MutatingAdmissionPolicyBinding extends KubeObject<
  ClusterScopedMetadata,
  void,
  MutatingAdmissionPolicyBindingSpec
> {
  static readonly kind = "MutatingAdmissionPolicyBinding";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicybindings";

  getPolicyName(): string | undefined {
    return this.spec.policyName;
  }

  getParamRef(): ParamRef | undefined {
    return this.spec.paramRef;
  }

  getMatchResources(): MatchResources | undefined {
    return this.spec.matchResources;
  }
}
