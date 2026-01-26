/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface BackendLBPolicyTargetRef {
  group: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface BackendLBPolicySpec {
  targetRef: BackendLBPolicyTargetRef;
  policyType?: string;
  slowStart?: {
    duration?: string;
  };
  trafficType?: "Application" | "System";
}

export interface BackendLBPolicyStatus {
  conditions?: Array<{
    type: string;
    status: "True" | "False" | "Unknown";
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
  ancestors?: Array<{
    ref: {
      group: string;
      kind: string;
      name: string;
      namespace?: string;
    };
    controllerName?: string;
    conditions?: Array<{
      type: string;
      status: "True" | "False" | "Unknown";
      reason?: string;
      message?: string;
    }>;
  }>;
}

export class BackendLBPolicy extends KubeObject<NamespaceScopedMetadata, BackendLBPolicyStatus, BackendLBPolicySpec> {
  static readonly kind = "BackendLBPolicy";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/backendlbpolicies";

  getTargetRefs(): BackendLBPolicyTargetRef[] {
    return [this.spec.targetRef];
  }

  getPolicyType(): string {
    return this.spec.policyType ?? "";
  }
}
