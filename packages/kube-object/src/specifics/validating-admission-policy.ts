/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { BaseKubeObjectCondition, ClusterScopedMetadata, LabelSelector } from "../api-types";
import type { RuleWithOperations } from "./mutating-webhook-configuration";

export interface ParamKind {
  apiVersion?: string;
  kind?: string;
}

export interface NamedRuleWithOperations extends RuleWithOperations {
  resourceNames?: string[];
}

export interface MatchResources {
  namespaceSelector?: LabelSelector;
  objectSelector?: LabelSelector;
  resourceRules?: NamedRuleWithOperations[];
  excludeResourceRules?: NamedRuleWithOperations[];
  matchPolicy?: "Exact" | "Equivalent";
}

export interface Validation {
  expression: string;
  message?: string;
  reason?: string;
  messageExpression?: string;
}

export interface AuditAnnotation {
  key: string;
  valueExpression: string;
}

export interface MatchCondition {
  name: string;
  expression: string;
}

export interface Variable {
  name: string;
  expression: string;
}

export interface ValidatingAdmissionPolicySpec {
  paramKind?: ParamKind;
  matchConstraints?: MatchResources;
  validations?: Validation[];
  failurePolicy?: "Ignore" | "Fail";
  auditAnnotations?: AuditAnnotation[];
  matchConditions?: MatchCondition[];
  variables?: Variable[];
}

export interface ExpressionWarning {
  fieldRef: string;
  warning: string;
}

export interface TypeChecking {
  expressionWarnings?: ExpressionWarning[];
}

export interface ValidatingAdmissionPolicyStatus {
  observedGeneration?: number;
  typeChecking?: TypeChecking;
  conditions?: BaseKubeObjectCondition[];
}

export class ValidatingAdmissionPolicy extends KubeObject<
  ClusterScopedMetadata,
  ValidatingAdmissionPolicyStatus,
  ValidatingAdmissionPolicySpec
> {
  static readonly kind = "ValidatingAdmissionPolicy";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies";

  getValidations(): Validation[] {
    return this.spec.validations ?? [];
  }

  getFailurePolicy(): string | undefined {
    return this.spec.failurePolicy;
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

  getAuditAnnotations(): AuditAnnotation[] {
    return this.spec.auditAnnotations ?? [];
  }

  getConditions(): BaseKubeObjectCondition[] {
    return this.status?.conditions ?? [];
  }
}
