/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface TLSRouteParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface TLSRouteBackendRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  port?: number;
  weight?: number;
}

export interface TLSRouteRule {
  backendRefs: TLSRouteBackendRef[];
}

export interface TLSRouteSpec {
  parentRefs?: TLSRouteParentReference[];
  hostnames?: string[];
  rules: TLSRouteRule[];
}

export interface TLSRouteStatus {
  parents?: Array<{
    parentRef: TLSRouteParentReference;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string }>;
  }>;
}

export class TLSRoute extends KubeObject<NamespaceScopedMetadata, TLSRouteStatus, TLSRouteSpec> {
  static readonly kind = "TLSRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/tlsroutes";

  getParentRefs(): TLSRouteParentReference[] {
    return this.spec.parentRefs ?? [];
  }

  getParentNames(): string[] {
    return this.getParentRefs().map((p) => p.name);
  }

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }
}
