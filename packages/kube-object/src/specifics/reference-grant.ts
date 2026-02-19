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

/**
 * ReferenceGrant grants permission for one resource (from) to reference another resource (to).
 *
 * ReferenceGrants are namespace-scoped and enable cross-namespace references between
 * Gateway API resources (e.g., allowing an HTTPRoute in namespace A to attach to a
 * Gateway in namespace B). They also control Secret references for TLS certificates.
 *
 * @see https://gateway-api.sigs.k8s.io/v1alpha2/references/spec/#gateway.networking.k8s.io/v1beta1.ReferenceGrant
 */
export class ReferenceGrant extends KubeObject<NamespaceScopedMetadata, void, ReferenceGrantSpec> {
  static readonly kind = "ReferenceGrant";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1beta1/referencegrants";

  /**
   * Get the list of resources that are granted permission to reference.
   * These resources can reference the resources specified in "to".
   */
  getFrom(): ReferenceGrantFrom[] {
    return this.spec.from ?? [];
  }

  /**
   * Get the list of resources that can be referenced.
   * These are the resources that "from" resources are allowed to reference.
   */
  getTo(): ReferenceGrantTo[] {
    return this.spec.to ?? [];
  }
}
