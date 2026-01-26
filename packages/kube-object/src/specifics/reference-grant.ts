/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export type ReferenceKind =
  | "Gateway"
  | "GRPCRoute"
  | "HTTPRoute"
  | "TCPRoute"
  | "TLSRoute"
  | "UDPRoute"
  | "Secret"
  | "Service";

export interface ReferenceGrantFrom {
  group: string;
  kind: ReferenceKind;
  namespace?: string;
}

export interface ReferenceGrantTo {
  group: string;
  kind: ReferenceKind;
  name?: string;
}

export interface ReferenceGrantSpec {
  from: ReferenceGrantFrom[];
  to: ReferenceGrantTo[];
}

export class ReferenceGrant extends KubeObject<NamespaceScopedMetadata, void, ReferenceGrantSpec> {
  static readonly kind = "ReferenceGrant";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1beta1/referencegrants";

  getFrom(): ReferenceGrantFrom[] {
    return this.spec.from ?? [];
  }

  getTo(): ReferenceGrantTo[] {
    return this.spec.to ?? [];
  }
}
