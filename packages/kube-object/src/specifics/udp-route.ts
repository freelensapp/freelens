/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type UDPRouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

export type UDPRouteBackendKind = "Service";

export interface UDPRouteParentReference {
  group?: string;
  kind: UDPRouteKind;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface UDPRouteBackendRef {
  group?: string;
  kind?: UDPRouteBackendKind;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface UDPRouteRule {
  backendRefs: UDPRouteBackendRef[];
}

export interface UDPRouteSpec {
  commonParentRefs?: UDPRouteParentReference[];
  parentRefs?: UDPRouteParentReference[];
  rules?: UDPRouteRule[];
}

export interface UDPRouteStatus {
  parents?: Array<{
    parentRef: UDPRouteParentReference;
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
 * UDPRoute defines UDP routing rules for forwarding UDP datagrams to backend Services.
 *
 * UDPRoutes are protocol-agnostic and route UDP packets based on the Gateway listener
 * port. UDP is connectionless, so features like session affinity are important for
 * routing packets from the same client to the same backend. Common use cases include
 * DNS, logging, gaming, and streaming protocols.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1alpha2.UDPRoute
 */
export class UDPRoute extends KubeObject<NamespaceScopedMetadata, UDPRouteStatus, UDPRouteSpec> {
  static readonly kind = "UDPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/udproutes";

  /**
   * Get all Gateway parent references this route attaches to.
   * Merges commonParentRefs (shared across all rules) with parentRefs (rule-specific).
   */
  getParentRefs(): UDPRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  /**
   * Aggregate all backend references from all rules.
   * Returns the complete list of backend Services this route forwards traffic to.
   */
  getBackendRefs(): UDPRouteBackendRef[] {
    const refs: UDPRouteBackendRef[] = [];
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
