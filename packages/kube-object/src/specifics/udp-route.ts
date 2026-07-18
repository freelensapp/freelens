/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface UDPRouteParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface UDPRouteBackendRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  port?: number;
  weight?: number;
}

export interface UDPRouteRule {
  backendRefs: UDPRouteBackendRef[];
}

export interface UDPRouteSpec {
  parentRefs?: UDPRouteParentReference[];
  rules: UDPRouteRule[];
}

export interface UDPRouteStatus {
  parents?: Array<{
    parentRef: UDPRouteParentReference;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string }>;
  }>;
}

export class UDPRoute extends KubeObject<NamespaceScopedMetadata, UDPRouteStatus, UDPRouteSpec> {
  static readonly kind = "UDPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/udproutes";

  getParentRefs(): UDPRouteParentReference[] {
    return this.spec.parentRefs ?? [];
  }

  getParentNames(): string[] {
    return this.getParentRefs().map((p) => p.name);
  }
}
