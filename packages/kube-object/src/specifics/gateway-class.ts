/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { ClusterScopedMetadata } from "../api-types";

export interface GatewayClassParametersReference {
  group: string;
  kind: string;
  name: string;
  namespace?: string;
}

export interface GatewayClassSpec {
  controllerName: string;
  parametersRef?: GatewayClassParametersReference;
  description?: string;
}

export interface GatewayClassCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
}

export interface GatewayClassStatus {
  conditions?: GatewayClassCondition[];
  supportedFeatures?: string[];
}

export class GatewayClass extends KubeObject<ClusterScopedMetadata, GatewayClassStatus, GatewayClassSpec> {
  static readonly kind = "GatewayClass";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/gateway.networking.k8s.io/v1/gatewayclasses";

  getController(): string {
    return this.spec.controllerName;
  }

  getConditions(): GatewayClassCondition[] {
    return this.status?.conditions ?? [];
  }

  getAcceptedCondition(): GatewayClassCondition | undefined {
    return this.getConditions().find((c) => c.type === "Accepted");
  }
}
