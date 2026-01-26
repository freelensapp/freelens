/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface BackendTLSPolicyTargetRef {
  group: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface BackendTLSPolicyCaCertRefs {
  group: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface BackendTLSPolicySpec {
  targetRefs: BackendTLSPolicyTargetRef[];
  caCertRefs: BackendTLSPolicyCaCertRefs[];
  hostname?: string;
  tlsVersion?: string;
  ciphers?: string[];
}

export interface BackendTLSPolicyStatus {
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

export class BackendTLSPolicy extends KubeObject<
  NamespaceScopedMetadata,
  BackendTLSPolicyStatus,
  BackendTLSPolicySpec
> {
  static readonly kind = "BackendTLSPolicy";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/backendtlspolicies";

  getTargetRefs(): BackendTLSPolicyTargetRef[] {
    return this.spec.targetRefs ?? [];
  }

  getCaCertRefs(): BackendTLSPolicyCaCertRefs[] {
    return this.spec.caCertRefs ?? [];
  }

  getHostname(): string | undefined {
    return this.spec.hostname;
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
