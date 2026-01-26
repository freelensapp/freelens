/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type RouteKind = "Gateway" | "GRPCRoute" | "HTTPRoute" | "TCPRoute" | "TLSRoute" | "UDPRoute";

export type UDPRouteBackendKind = "Service";

export interface UDPRouteParentReference {
  group?: string;
  kind: RouteKind;
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

export class UDPRoute extends KubeObject<NamespaceScopedMetadata, UDPRouteStatus, UDPRouteSpec> {
  static readonly kind = "UDPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/udproutes";

  getParentRefs(): UDPRouteParentReference[] {
    return [...(this.spec.commonParentRefs ?? []), ...(this.spec.parentRefs ?? [])];
  }

  getBackendRefs(): UDPRouteBackendRef[] {
    const refs: UDPRouteBackendRef[] = [];
    for (const rule of this.spec.rules ?? []) {
      refs.push(...(rule.backendRefs ?? []));
    }
    return refs;
  }
}
