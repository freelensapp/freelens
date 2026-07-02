/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { ClusterScopedMetadata, LabelSelector } from "../api-types";
import type { MatchResources } from "./validating-admission-policy";

export interface ParamRef {
  name?: string;
  namespace?: string;
  selector?: LabelSelector;
  parameterNotFoundAction?: "Allow" | "Deny";
}

export interface ValidatingAdmissionPolicyBindingSpec {
  policyName?: string;
  paramRef?: ParamRef;
  matchResources?: MatchResources;
  validationActions?: ("Deny" | "Warn" | "Audit")[];
}

export class ValidatingAdmissionPolicyBinding extends KubeObject<
  ClusterScopedMetadata,
  void,
  ValidatingAdmissionPolicyBindingSpec
> {
  static readonly kind = "ValidatingAdmissionPolicyBinding";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicybindings";

  getPolicyName(): string | undefined {
    return this.spec.policyName;
  }

  getValidationActions(): string[] {
    return this.spec.validationActions ?? [];
  }

  getParamRef(): ParamRef | undefined {
    return this.spec.paramRef;
  }

  getMatchResources(): MatchResources | undefined {
    return this.spec.matchResources;
  }
}
