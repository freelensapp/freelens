/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type RouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

export type TLSRouteBackendKind = "Service";

export interface TLSRouteParentReference {
  group?: string;
  kind: RouteKind;
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

export class TLSRoute extends KubeObject<NamespaceScopedMetadata, TLSRouteStatus, TLSRouteSpec> {
  static readonly kind = "TLSRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/tlsroutes";

  getParentRefs(): TLSRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getHostnames(): string[] {
    return this.spec.hostnames ?? [];
  }

  getBackendRefs(): TLSRouteBackendRef[] {
    const refs: TLSRouteBackendRef[] = [];
    for (const rule of this.spec.rules ?? []) {
      refs.push(...(rule.backendRefs ?? []));
    }
    return refs;
  }
}
