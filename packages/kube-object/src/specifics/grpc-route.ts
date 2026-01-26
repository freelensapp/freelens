/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface GRPCRouteParentReference {
  group?: string;
  kind: string;
  name: string;
  namespace?: string;
  sectionName?: string;
  port?: number;
}

export interface GRPCRouteBackendRef {
  group?: string;
  kind?: string;
  name: string;
  namespace?: string;
  port?: number;
  weight?: number;
}

export interface GRPCRouteMatch {
  method?: {
    type?: string;
    service?: string;
    method?: string;
  };
  headers?: Array<{
    type: string;
    name: string;
    value?: string;
  }>;
}

export interface GRPCRouteFilter {
  type: string;
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

  getParentRefs(): GRPCRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getRoutes(): GRPCRouteRule[] {
    return this.spec.rules ?? [];
  }
}
