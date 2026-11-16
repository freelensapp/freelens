/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { ClusterScopedMetadata } from "../api-types";
import type { MatchCondition, MatchResources, ParamKind, Variable } from "./validating-admission-policy";

export interface ApplyConfiguration {
  expression?: string;
}

export interface JSONPatch {
  expression?: string;
}

export interface Mutation {
  patchType: "ApplyConfiguration" | "JSONPatch";
  applyConfiguration?: ApplyConfiguration;
  jsonPatch?: JSONPatch;
}

export interface MutatingAdmissionPolicySpec {
  paramKind?: ParamKind;
  matchConstraints?: MatchResources;
  variables?: Variable[];
  mutations?: Mutation[];
  failurePolicy?: "Ignore" | "Fail";
  matchConditions?: MatchCondition[];
  reinvocationPolicy?: "Never" | "IfNeeded";
}

export class MutatingAdmissionPolicy extends KubeObject<ClusterScopedMetadata, void, MutatingAdmissionPolicySpec> {
  static readonly kind = "MutatingAdmissionPolicy";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicies";

  getMutations(): Mutation[] {
    return this.spec.mutations ?? [];
  }

  getFailurePolicy(): string | undefined {
    return this.spec.failurePolicy;
  }

  getReinvocationPolicy(): string | undefined {
    return this.spec.reinvocationPolicy;
  }

  getParamKind(): ParamKind | undefined {
    return this.spec.paramKind;
  }

  getMatchConstraints(): MatchResources | undefined {
    return this.spec.matchConstraints;
  }

  getMatchConditions(): MatchCondition[] {
    return this.spec.matchConditions ?? [];
  }

  getVariables(): Variable[] {
    return this.spec.variables ?? [];
  }
}
