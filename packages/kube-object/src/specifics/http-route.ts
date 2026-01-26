/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface HTTPRouteParentReference {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface HTTPRouteBackendRef {
  group?: string;
  kind?: string;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface HTTPRouteMatch {
  path?: {
    type?: string;
    value?: string;
  };
  headers?: Array<{
    type: string;
    name: string;
    value?: string;
  }>;
  queryParams?: Array<{
    type: string;
    name: string;
    value?: string;
  }>;
  method?: string;
}

export interface HTTPRouteFilter {
  type: string;
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

  getParentRefs(): HTTPRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getRoutes(): HTTPRouteRule[] {
    return this.spec.rules ?? [];
  }
}
