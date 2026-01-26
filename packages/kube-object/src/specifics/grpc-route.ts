/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type GRPCRouteParentKind = "Gateway";

export type GRPCRouteBackendKind = "Service";

export type GRPCMethodMatchType = "Exact" | "RegularExpression";

export type GRPCHeaderMatchType = "Exact" | "RegularExpression";

export type GRPCRouteFilterType = "RequestHeaderModifier" | "RequestMirror" | "ExtensionRef";

export interface GRPCRouteParentReference {
  group?: string;
  kind: GRPCRouteParentKind;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface GRPCRouteBackendRef {
  group?: string;
  kind?: GRPCRouteBackendKind;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface GRPCRouteMatch {
  method?: {
    type?: GRPCMethodMatchType;
    service?: string;
    method?: string;
  };
  headers?: Array<{
    type: GRPCHeaderMatchType;
    name: string;
    value?: string;
  }>;
}

export interface GRPCRouteFilter {
  type: GRPCRouteFilterType;
  requestHeaderModifier?: {
    set?: Array<{ name: string; value: string }>;
    add?: Array<{ name: string; value: string }>;
    remove?: string[];
  };
}

export interface GRPCRouteRule {
  matches?: GRPCRouteMatch[];
  filters?: GRPCRouteFilter[];
  backendRefs?: GRPCRouteBackendRef[];
}

export interface GRPCRouteSpec {
  commonParentRefs?: GRPCRouteParentReference[];
  parentRefs?: GRPCRouteParentReference[];
  hostnames?: string[];
  rules?: GRPCRouteRule[];
}

export interface GRPCRouteStatus {
  parents?: Array<{
    parentRef: GRPCRouteParentReference;
    controllerName?: string;
    conditions?: Array<{
      type: string;
      status: "True" | "False" | "Unknown";
      reason?: string;
      message?: string;
    }>;
  }>;
}

export class GRPCRoute extends KubeObject<NamespaceScopedMetadata, GRPCRouteStatus, GRPCRouteSpec> {
  static readonly kind = "GRPCRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/grpcroutes";

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }

  /**
   * Get all parent references (Gateways) this route attaches to.
   * Merges commonParentRefs (shared across all rules) with parentRefs (rule-specific).
   */
  getParentRefs(): GRPCRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getRoutes(): GRPCRouteRule[] {
    return this.spec.rules ?? [];
  }

  /**
   * Aggregate all backend refs from all rules.
   */
  getBackendRefs(): GRPCRouteBackendRef[] {
    const refs: GRPCRouteBackendRef[] = [];
    for (const rule of this.spec.rules ?? []) {
      refs.push(...(rule.backendRefs ?? []));
    }
    return refs;
  }

  /**
   * Aggregate all filters from all rules.
   */
  getFilters(): GRPCRouteFilter[] {
    const filters: GRPCRouteFilter[] = [];
    for (const rule of this.spec.rules ?? []) {
      filters.push(...(rule.filters ?? []));
    }
    return filters;
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
