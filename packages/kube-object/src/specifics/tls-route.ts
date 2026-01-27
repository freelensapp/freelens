/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type TLSRouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

export type TLSRouteBackendKind = "Service";

export interface TLSRouteParentReference {
  group?: string;
  kind: TLSRouteKind;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface TLSRouteBackendRef {
  group?: string;
  kind?: TLSRouteBackendKind;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface TLSRouteDistinction {
  hostname?: string;
}

export interface TLSRouteRule {
  distinction?: TLSRouteDistinction;
  backendRefs: TLSRouteBackendRef[];
}

export interface TLSRouteSpec {
  commonParentRefs?: TLSRouteParentReference[];
  parentRefs?: TLSRouteParentReference[];
  hostnames?: string[];
  rules?: TLSRouteRule[];
}

export interface TLSRouteStatus {
  parents?: Array<{
    parentRef: TLSRouteParentReference;
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
 * TLSRoute defines TLS routing rules for forwarding TLS connections to backend Services.
 *
 * TLSRoutes terminate TLS at the Gateway and route decrypted traffic based on SNI
 * (Server Name Indication). They enable dynamic routing without requiring a separate
 * IP address per service. The Gateway handles TLS termination, and the backend receives
 * decrypted traffic.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1alpha2.TLSRoute
 */
export class TLSRoute extends KubeObject<NamespaceScopedMetadata, TLSRouteStatus, TLSRouteSpec> {
  static readonly kind = "TLSRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/tlsroutes";

  /**
   * Get all Gateway parent references this route attaches to.
   * Merges commonParentRefs (shared across all rules) with parentRefs (rule-specific).
   */
  getParentRefs(): TLSRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  /**
   * Get hostnames for SNI-based routing.
   * The Gateway uses the TLS SNI extension to route connections to matching backends.
   */
  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }

  /**
   * Aggregate all backend references from all rules.
   * Returns the complete list of backend Services this route forwards traffic to.
   */
  getBackendRefs(): TLSRouteBackendRef[] {
    const refs: TLSRouteBackendRef[] = [];
    for (const rule of this.spec.rules ?? []) {
      refs.push(...(rule.backendRefs ?? []));
    }
    return refs;
  }

  /**
   * Check if this route is accepted by any parent.
   * Returns true when any parent has an "Accepted" condition with status "True".
   */
  isAccepted(): boolean {
    return (
      this.status?.parents?.some((parent) =>
        parent.conditions?.some((c) => c.type === "Accepted" && c.status === "True"),
      ) ?? false
    );
  }
}
