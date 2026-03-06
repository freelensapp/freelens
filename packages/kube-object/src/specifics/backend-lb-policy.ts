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

/**
 * BackendLBPolicy defines load balancing behavior for traffic to backend Services.
 *
 * BackendLBPolicy controls how Gateways distribute traffic across backend endpoints,
 * including slow start (gradual traffic ramp-up) and different traffic types
 * (Application vs System). This enables graceful rollout and optimal resource utilization.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1alpha2.BackendLBPolicy
 */
export class BackendLBPolicy extends KubeObject<NamespaceScopedMetadata, BackendLBPolicyStatus, BackendLBPolicySpec> {
  static readonly kind = "BackendLBPolicy";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/backendlbpolicies";

  /**
   * Get target references for this policy.
   * Returns the single targetRef wrapped in an array for consistency with other policy types.
   */
  getTargetRefs(): BackendLBPolicyTargetRef[] {
    return [this.spec.targetRef];
  }

  /**
   * Get the load balancing policy type (e.g., "RoundRobin", "LeastConnection").
   * The specific values depend on the controller implementation.
   */
  getPolicyType(): string {
    return this.spec.policyType ?? "";
  }

  /**
   * Get all conditions from the policy status.
   */
  getConditions(): Array<{
    type: string;
    status: "True" | "False" | "Unknown";
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }> {
    return this.status?.conditions ?? [];
  }

  /**
   * Check if this policy is accepted.
   * Returns true when the "Accepted" condition in status is True.
   */
  isAccepted(): boolean {
    return this.status?.conditions?.some((c) => c.type === "Accepted" && c.status === "True") ?? false;
  }
}
