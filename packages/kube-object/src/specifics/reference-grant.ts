/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { NamespaceScopedMetadata } from "../api-types";

export interface ReferenceGrantFrom {
  group: string;
  kind: string;
  namespace?: string;
}

export interface ReferenceGrantTo {
  group: string;
  kind: string;
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
