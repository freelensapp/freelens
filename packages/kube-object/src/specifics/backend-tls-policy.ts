/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface BackendTLSPolicyTargetRef {
  group: string;
  kind: string;
  name: string;
  sectionName?: string;
  namespace?: string;
}

export interface BackendTLSPolicyCACertRef {
  group: string;
  kind: string;
  name: string;
}

export interface BackendTLSPolicyValidation {
  caCertificateRefs?: BackendTLSPolicyCACertRef[];
  wellKnownCACertificates?: string;
  hostname: string;
}

export interface BackendTLSPolicySpec {
  targetRefs: BackendTLSPolicyTargetRef[];
  validation: BackendTLSPolicyValidation;
  options?: Record<string, string>;
}

export interface BackendTLSPolicyAncestorRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface BackendTLSPolicyStatus {
  ancestors?: Array<{
    ancestorRef: BackendTLSPolicyAncestorRef;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
  }>;
}

export class BackendTLSPolicy extends KubeObject<
  NamespaceScopedMetadata,
  BackendTLSPolicyStatus,
  BackendTLSPolicySpec
> {
  static readonly kind = "BackendTLSPolicy";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha3/backendtlspolicies";

  getTargetRefs(): BackendTLSPolicyTargetRef[] {
    return this.spec.targetRefs ?? [];
  }

  getTargetNames(): string[] {
    return this.getTargetRefs().map((t) => t.name);
  }

  getHostname(): string {
    return this.spec.validation.hostname ?? "";
  }
}
