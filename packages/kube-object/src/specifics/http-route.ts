/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface HTTPRouteParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface HTTPRouteMatch {
  path?: { type?: string; value?: string };
  headers?: Array<{ type?: string; name: string; value: string }>;
  queryParams?: Array<{ type?: string; name: string; value: string }>;
  method?: string;
}

export interface HTTPRouteBackendRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  port?: number;
  weight?: number;
}

export interface HTTPRouteRule {
  matches?: HTTPRouteMatch[];
  backendRefs?: HTTPRouteBackendRef[];
  timeouts?: { request?: string; backendRequest?: string };
}

export interface HTTPRouteSpec {
  parentRefs?: HTTPRouteParentReference[];
  hostnames?: string[];
  rules?: HTTPRouteRule[];
}

export interface HTTPRouteStatus {
  parents?: Array<{
    parentRef: HTTPRouteParentReference;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string; message?: string }>;
  }>;
}

export class HTTPRoute extends KubeObject<NamespaceScopedMetadata, HTTPRouteStatus, HTTPRouteSpec> {
  static readonly kind = "HTTPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/httproutes";

  getParentRefs(): HTTPRouteParentReference[] {
    return this.spec.parentRefs ?? [];
  }

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }

  getParentNames(): string[] {
    return this.getParentRefs().map((p) => p.name);
  }
}
