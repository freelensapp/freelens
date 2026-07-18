/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface TCPRouteParentReference {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  sectionName?: string;
  port?: number;
}

export interface TCPRouteBackendRef {
  group?: string;
  kind?: string;
  namespace?: string;
  name: string;
  port?: number;
  weight?: number;
}

export interface TCPRouteRule {
  backendRefs: TCPRouteBackendRef[];
}

export interface TCPRouteSpec {
  parentRefs?: TCPRouteParentReference[];
  rules: TCPRouteRule[];
}

export interface TCPRouteStatus {
  parents?: Array<{
    parentRef: TCPRouteParentReference;
    controllerName: string;
    conditions?: Array<{ type: string; status: string; reason?: string }>;
  }>;
}

export class TCPRoute extends KubeObject<NamespaceScopedMetadata, TCPRouteStatus, TCPRouteSpec> {
  static readonly kind = "TCPRoute";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1alpha2/tcproutes";

  getParentRefs(): TCPRouteParentReference[] {
    return this.spec.parentRefs ?? [];
  }

  getParentNames(): string[] {
    return this.getParentRefs().map((p) => p.name);
  }
}
