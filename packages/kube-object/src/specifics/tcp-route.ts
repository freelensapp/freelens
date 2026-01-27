/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type RouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

export type TCPRouteBackendKind = "Service";

export interface TCPRouteParentReference {
  group?: string;
  kind: RouteKind;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface TCPRouteBackendRef {
  group?: string;
  kind?: TCPRouteBackendKind;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface TCPRouteRule {
  backendRefs: TCPRouteBackendRef[];
}

export interface TCPRouteSpec {
  commonParentRefs?: TCPRouteParentReference[];
  parentRefs?: TCPRouteParentReference[];
  rules?: TCPRouteRule[];
}

export interface TCPRouteStatus {
  parents?: Array<{
    parentRef: TCPRouteParentReference;
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
 * TCPRoute defines TCP routing rules for forwarding TCP streams to backend Services.
 *
 * TCPRoutes are protocol-agnostic and route raw TCP connections based on the Gateway
 * listener port. Unlike HTTPRoute, they cannot inspect application layer data.
 * TCPRoutes are useful for non-HTTP protocols like databases, message queues, etc.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1alpha2.TCPRoute
 */
export class TCPRoute extends KubeObject<NamespaceScopedMetadata, TCPRouteStatus, TCPRouteSpec> {
  static readonly kind = "TCPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/tcproutes";

  /**
   * Get all Gateway parent references this route attaches to.
   * Merges commonParentRefs (shared across all rules) with parentRefs (rule-specific).
   */
  getParentRefs(): TCPRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  /**
   * Aggregate all backend references from all rules.
   * Returns the complete list of backend Services this route forwards traffic to.
   */
  getBackendRefs(): TCPRouteBackendRef[] {
    const refs: TCPRouteBackendRef[] = [];
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
