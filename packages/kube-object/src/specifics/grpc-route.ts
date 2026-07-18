/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface GRPCRouteMethodMatch {
  type?: "Exact" | "RegularExpression";
  service?: string;
  method?: string;
}

export interface GRPCRouteMatch {
  method?: GRPCRouteMethodMatch;
  headers?: Array<{ type?: string; name: string; value: string }>;
}

export interface GRPCRouteBackendRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  port?: number;
  weight?: number;
}

export interface GRPCRouteRule {
  matches?: GRPCRouteMatch[];
  backendRefs?: GRPCRouteBackendRef[];
}

export interface GRPCRouteParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface GRPCRouteSpec {
  parentRefs?: GRPCRouteParentReference[];
  hostnames?: string[];
  rules?: GRPCRouteRule[];
}

export interface GRPCRouteStatus {
  parents?: Array<{
    parentRef: GRPCRouteParentReference;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string }>;
  }>;
}

export class GRPCRoute extends KubeObject<NamespaceScopedMetadata, GRPCRouteStatus, GRPCRouteSpec> {
  static readonly kind = "GRPCRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/grpcroutes";

  getParentRefs(): GRPCRouteParentReference[] {
    return this.spec.parentRefs ?? [];
  }

  getParentNames(): string[] {
    return this.getParentRefs().map((p) => p.name);
  }

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }
}
