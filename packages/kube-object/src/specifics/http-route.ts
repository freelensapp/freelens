/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type HTTPRouteParentKind = "Gateway";

export type HTTPRouteBackendKind = "Service";

export type PathMatchType = "Exact" | "PathPrefix" | "RegularExpression";

export type HeaderMatchType = "Exact" | "RegularExpression";

export type QueryParamMatchType = "Exact" | "RegularExpression";

export type HTTPMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";

export type HTTPRouteFilterType =
  | "RequestHeaderModifier"
  | "RequestRedirect"
  | "RequestMirror"
  | "URLRewrite"
  | "ExtensionRef";

export interface HTTPRouteParentReference {
  group?: string;
  kind: HTTPRouteParentKind;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface HTTPRouteBackendRef {
  group?: string;
  kind?: HTTPRouteBackendKind;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface HTTPRouteMatch {
  path?: {
    type?: PathMatchType;
    value?: string;
  };
  headers?: Array<{
    type: HeaderMatchType;
    name: string;
    value?: string;
  }>;
  queryParams?: Array<{
    type: QueryParamMatchType;
    name: string;
    value?: string;
  }>;
  method?: HTTPMethod;
}

export interface HTTPRouteFilter {
  type: HTTPRouteFilterType;
  requestHeaderModifier?: {
    set?: Array<{ name: string; value: string }>;
    add?: Array<{ name: string; value: string }>;
    remove?: string[];
  };
}

export interface HTTPRouteRule {
  matches?: HTTPRouteMatch[];
  filters?: HTTPRouteFilter[];
  backendRefs?: HTTPRouteBackendRef[];
  timeout?: string;
}

export interface HTTPRouteSpec {
  commonParentRefs?: HTTPRouteParentReference[];
  parentRefs?: HTTPRouteParentReference[];
  hostnames?: string[];
  rules?: HTTPRouteRule[];
}

export interface HTTPRouteStatus {
  parents?: Array<{
    parentRef: HTTPRouteParentReference;
    controllerName?: string;
    conditions?: Array<{
      type: string;
      status: "True" | "False" | "Unknown";
      reason?: string;
      message?: string;
    }>;
  }>;
}

export class HTTPRoute extends KubeObject<NamespaceScopedMetadata, HTTPRouteStatus, HTTPRouteSpec> {
  static readonly kind = "HTTPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/httproutes";

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }

  /**
   * Get all parent references (Gateways) this route attaches to.
   * Merges commonParentRefs (shared across all rules) with parentRefs (rule-specific).
   */
  getParentRefs(): HTTPRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getRoutes(): HTTPRouteRule[] {
    return this.spec.rules ?? [];
  }

  /**
   * Aggregate all backend refs from all rules.
   */
  getBackendRefs(): HTTPRouteBackendRef[] {
    const refs: HTTPRouteBackendRef[] = [];
    for (const rule of this.spec.rules ?? []) {
      refs.push(...(rule.backendRefs ?? []));
    }
    return refs;
  }

  /**
   * Aggregate all filters from all rules.
   */
  getFilters(): HTTPRouteFilter[] {
    const filters: HTTPRouteFilter[] = [];
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
