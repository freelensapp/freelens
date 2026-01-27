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

/**
 * BackendTLSPolicy defines TLS configuration for connections from Gateway to backend Services.
 *
 * BackendTLSPolicy specifies how Gateways should connect to backend services over TLS,
 * including CA certificates for validation, expected hostname (SNI), TLS versions, and
 * cipher suites. This enables mTLS (mutual TLS) or custom TLS configurations for
 * backend connections.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1.BackendTLSPolicy
 */
export class BackendTLSPolicy extends KubeObject<
  NamespaceScopedMetadata,
  BackendTLSPolicyStatus,
  BackendTLSPolicySpec
> {
  static readonly kind = "BackendTLSPolicy";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/backendtlspolicies";

  /**
   * Get the backend Service(s) this policy applies to.
   * Gateways use this policy when connecting to the specified backends.
   */
  getTargetRefs(): BackendTLSPolicyTargetRef[] {
    return this.spec.targetRefs ?? [];
  }

  /**
   * Get CA certificate references for validating backend certificates.
   * Gateways use these CAs to verify the backend server's certificate.
   */
  getCaCertRefs(): BackendTLSPolicyCaCertRefs[] {
    return this.spec.caCertRefs ?? [];
  }

  /**
   * Get the expected hostname for backend TLS verification.
   * Used for SNI (Server Name Indication) and certificate hostname validation.
   */
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
